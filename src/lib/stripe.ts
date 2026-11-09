import "server-only";
import Stripe from "stripe";
import type { Organization } from "@prisma/client";
import { db } from "./db";
import { amountDue } from "./pricing";
import { logEvent } from "./events";

/**
 * Pagamenti per conto terzi con Stripe Connect (modello "marketplace"):
 * - ogni ristorante ha un account collegato (Accounts v2, dashboard Express, configurazione "recipient");
 * - l'organizzatore paga con Stripe Checkout (destination charge);
 * - ForGroups trattiene la provvigione con `application_fee_amount`, il resto va al ristorante.
 */

let client: Stripe | null = null;

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe non configurato: imposta STRIPE_SECRET_KEY (consigliata una restricted key rk_…)");
  client ??= new Stripe(key);
  return client;
}

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Crea (se manca) l'account collegato del ristorante. */
export async function ensureConnectedAccount(org: Organization): Promise<string> {
  if (org.stripeAccountId) return org.stripeAccountId;
  const stripe = getStripe();
  const account = await stripe.v2.core.accounts.create({
    display_name: org.billingName || org.name,
    contact_email: org.email ?? undefined,
    dashboard: "express",
    identity: { country: "it" },
    defaults: {
      currency: "eur",
      locales: ["it-IT"],
      responsibilities: { fees_collector: "application", losses_collector: "application" },
    },
    configuration: {
      recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
    },
    metadata: { forgroups_org_id: org.id },
    include: ["configuration.recipient"],
  });
  await db.organization.update({ where: { id: org.id }, data: { stripeAccountId: account.id } });
  await logEvent({ entityType: "organization", entityId: org.id, action: "stripe_account_created", summary: "Account Stripe creato" });
  return account.id;
}

/** Link di onboarding ospitato da Stripe (dati societari, IBAN, verifica identità). */
export async function onboardingLink(org: Organization, returnPath: string) {
  const accountId = await ensureConnectedAccount(org);
  const stripe = getStripe();
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        collection_options: { fields: "eventually_due" },
        refresh_url: `${appUrl()}/api/stripe/onboarding?org=${org.id}&back=${encodeURIComponent(returnPath)}`,
        return_url: `${appUrl()}${returnPath}${returnPath.includes("?") ? "&" : "?"}stripe=return`,
      },
    },
  });
  return link.url;
}

/** Rilegge lo stato della capability di incasso (fonte di verità: Stripe). */
export async function refreshAccountStatus(orgId: string) {
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org?.stripeAccountId) return null;
  const stripe = getStripe();
  const account = await stripe.v2.core.accounts.retrieve(org.stripeAccountId, {
    include: ["configuration.recipient", "requirements"],
  });
  const status = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
  const active = status === "active";
  if (active !== org.stripeTransfersActive) {
    await logEvent({
      entityType: "organization",
      entityId: org.id,
      action: "stripe_status",
      summary: active ? "Incassi online attivi" : `Incassi online non attivi (${status ?? "sconosciuto"})`,
    });
  }
  await db.organization.update({
    where: { id: org.id },
    data: { stripeTransfersActive: active, stripeCheckedAt: new Date() },
  });
  return { active, status: status ?? "unknown" };
}

/** Link alla dashboard Express del ristorante (incassi e bonifici). */
export async function expressDashboardLink(accountId: string) {
  const link = await getStripe().accounts.createLoginLink(accountId);
  return link.url;
}

/** Crea la sessione di pagamento per la prossima quota dovuta di una prenotazione. */
export async function createBookingCheckout(bookingId: string, returnPath: string) {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { restaurant: true, payments: true },
  });
  if (booking.status !== "CONFIRMED") throw new Error("La prenotazione deve essere confermata dal ristorante prima del pagamento.");
  const r = booking.restaurant;
  if (!r.stripeAccountId) throw new Error("Il ristorante non ha ancora attivato gli incassi online.");
  const status = await refreshAccountStatus(r.id); // ricontrolla sempre prima di incassare
  if (!status?.active) throw new Error("Gli incassi online del ristorante non sono ancora attivi.");

  const feesCollected = booking.payments
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((s, p) => s + p.applicationFeeCents, 0);
  const due = amountDue({ ...booking, feesCollectedCents: feesCollected });
  if (!due) throw new Error("Nessun importo da pagare online per questa prenotazione.");

  // Riusa una sessione ancora aperta per lo stesso importo
  const pending = booking.payments.find(
    (p) => p.status === "PENDING" && p.amountCents === due.amountCents && p.checkoutUrl,
  );
  if (pending?.checkoutUrl) return pending.checkoutUrl;

  const stripe = getStripe();
  const label = due.kind === "deposit" ? "Acconto" : due.kind === "balance" ? "Saldo" : "Pagamento";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.contactEmail ?? undefined,
    locale: "it",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: due.amountCents,
          product_data: {
            name: `${label} prenotazione ${booking.code} – ${r.name}`,
            description: `${booking.pax} persone · ${booking.date.toISOString().slice(0, 10)} ore ${booking.time}`,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: due.feeCents,
      transfer_data: { destination: r.stripeAccountId },
      description: `ForGroups ${booking.code}`,
      metadata: { booking_id: booking.id, booking_code: booking.code, kind: due.kind },
    },
    metadata: { booking_id: booking.id, kind: due.kind },
    integration_identifier: "forgroups_booking_wkzqpmte",
    success_url: `${appUrl()}${returnPath}?pagamento=ok`,
    cancel_url: `${appUrl()}${returnPath}?pagamento=annullato`,
  });

  await db.payment.create({
    data: {
      bookingId: booking.id,
      kind: due.kind,
      amountCents: due.amountCents,
      applicationFeeCents: due.feeCents,
      stripeCheckoutId: session.id,
      checkoutUrl: session.url,
    },
  });
  return session.url!;
}

/** Evasione da webhook: aggiorna pagamento e prenotazione. Idempotente. */
export async function markCheckoutPaid(sessionId: string, paymentIntentId: string | null) {
  const payment = await db.payment.findUnique({ where: { stripeCheckoutId: sessionId } });
  if (!payment || payment.status === "SUCCEEDED") return;
  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", paidAt: new Date(), stripePaymentIntent: paymentIntentId },
    });
    const b = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId } });
    const paid = b.paidCents + payment.amountCents;
    await tx.booking.update({
      where: { id: b.id },
      data: { paidCents: paid, paymentStatus: paid >= b.totalCents ? "PAID" : "PARTIAL" },
    });
  });
  await logEvent({
    entityType: "booking",
    entityId: payment.bookingId,
    action: "payment_succeeded",
    summary: `Pagamento online ricevuto (${(payment.amountCents / 100).toFixed(2)} €, provvigione trattenuta ${(payment.applicationFeeCents / 100).toFixed(2)} €)`,
  });
}

export async function markCheckoutFailed(sessionId: string) {
  const payment = await db.payment.findUnique({ where: { stripeCheckoutId: sessionId } });
  if (!payment || payment.status !== "PENDING") return;
  await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  await logEvent({ entityType: "booking", entityId: payment.bookingId, action: "payment_failed", summary: "Pagamento online non riuscito" });
}

/** Errori tecnici di Stripe → messaggio comprensibile; i nostri messaggi (già in italiano) passano invariati. */
export function friendlyError(e: unknown): string {
  if (e instanceof Stripe.errors.StripeError) {
    console.error("[stripe]", e.type, e.message);
    return "Non è stato possibile contattare il sistema di pagamento. Riprova tra qualche minuto o contatta ForGroups.";
  }
  return (e as Error).message;
}
