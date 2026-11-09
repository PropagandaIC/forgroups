"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bookingRole } from "@/lib/permissions";
import { logEvent } from "@/lib/events";
import { computeBooking } from "@/lib/pricing";
import { createBookingCheckout, friendlyError, stripeEnabled } from "@/lib/stripe";
import { BOOKING_STATUS } from "@/lib/labels";
import { parseDay } from "@/lib/format";
import type { FormState } from "./auth";

async function load(bookingId: string) {
  const user = await requireUser();
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { restaurant: true } });
  const role = bookingRole(user, booking);
  if (!role) throw new Error("Non autorizzato");
  return { user, booking, role };
}

const refresh = (code: string) => {
  revalidatePath(`/admin/prenotazioni/${code}`);
  revalidatePath(`/area/prenotazioni/${code}`);
  revalidatePath(`/ristoratore/prenotazioni/${code}`);
  revalidatePath("/admin");
};

/** Transizioni di stato consentite per ruolo */
const ALLOWED: Record<string, Partial<Record<BookingStatus, BookingStatus[]>>> = {
  admin: {
    REQUESTED: ["CONFIRMED", "DECLINED", "CANCELLED"],
    CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW", "REQUESTED"],
    DECLINED: ["REQUESTED"],
    CANCELLED: ["REQUESTED"],
    COMPLETED: ["CONFIRMED"],
    NO_SHOW: ["COMPLETED"],
  },
  restaurant: { REQUESTED: ["CONFIRMED", "DECLINED"], CONFIRMED: ["COMPLETED", "NO_SHOW"] },
  organizer: { REQUESTED: ["CANCELLED"], CONFIRMED: ["CANCELLED"] },
};

export async function setStatusAction(bookingId: string, status: BookingStatus, reason?: string): Promise<{ error?: string } | void> {
  const { user, booking, role } = await load(bookingId);
  if (!ALLOWED[role]?.[booking.status]?.includes(status)) return { error: "Cambio di stato non consentito" };
  if (role === "organizer" && status === "CANCELLED" && booking.paidCents > 0) return { error: "Prenotazione già pagata: contatta ForGroups per l'annullamento." };
  await db.booking.update({
    where: { id: bookingId },
    data: {
      status,
      confirmedAt: status === "CONFIRMED" ? new Date() : undefined,
      cancelledAt: status === "CANCELLED" ? new Date() : undefined,
    },
  });
  await logEvent({
    entityType: "booking",
    entityId: bookingId,
    action: "status_changed",
    userId: user.id,
    summary: `Stato: ${BOOKING_STATUS[booking.status].label} → ${BOOKING_STATUS[status].label}${reason ? ` (${reason})` : ""}`,
  });
  if (reason) await db.message.create({ data: { bookingId, authorId: user.id, body: reason } });
  refresh(booking.code);
}

export async function addMessageAction(_: FormState, form: FormData): Promise<FormState> {
  const bookingId = String(form.get("bookingId"));
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "Scrivi un messaggio" };
  const { user, booking, role } = await load(bookingId);
  const internal = role === "admin" && form.get("internal") === "on";
  await db.message.create({ data: { bookingId, authorId: user.id, body, internal } });
  refresh(booking.code);
  return { ok: "Inviato" };
}

const Edit = z.object({
  bookingId: z.string(),
  date: z.string().optional(),
  time: z.string().optional(),
  pax: z.coerce.number().int().min(1).optional(),
  priceEur: z.coerce.number().min(0).optional(),
  extrasEur: z.coerce.number().min(0).optional(),
  menuId: z.string().optional(),
  groupName: z.string().optional(),
  groupType: z.string().optional(),
  groupLeader: z.string().optional(),
  groupLeaderPhone: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  dietaryNotes: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  paymentMode: z.enum(["ONLINE_FULL", "ONLINE_DEPOSIT", "ON_SITE", "INVOICE"]).optional(),
  depositPercent: z.coerce.number().int().min(1).max(100).optional(),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
});

export async function updateBookingAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = Edit.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const { user, booking, role } = await load(d.bookingId);
  if (role !== "admin" && role !== "organizer") return { error: "Non autorizzato" };
  if (["COMPLETED", "CANCELLED"].includes(booking.status) && role !== "admin") return { error: "Prenotazione chiusa" };

  // L'organizzatore modifica solo i dati del gruppo
  const groupFields = {
    groupName: d.groupName, groupType: d.groupType, groupLeader: d.groupLeader, groupLeaderPhone: d.groupLeaderPhone,
    contactName: d.contactName, contactPhone: d.contactPhone, dietaryNotes: d.dietaryNotes, notes: d.notes,
  };
  let data: Record<string, unknown> = groupFields;
  const changes: string[] = [];

  if (role === "admin") {
    const menu = d.menuId ? await db.menu.findFirst({ where: { id: d.menuId, restaurantId: booking.restaurantId } }) : null;
    const pax = d.pax ?? booking.pax;
    const price = d.priceEur !== undefined ? Math.round(d.priceEur * 100) : menu && menu.id !== booking.menuId ? menu.priceCents : booking.priceCents;
    const extras = d.extrasEur !== undefined ? Math.round(d.extrasEur * 100) : booking.extrasCents;
    const rate = d.commissionPct !== undefined ? Math.round(d.commissionPct * 100) : booking.commissionRate;
    const freeEvery = (menu ?? (booking.menuId ? await db.menu.findUnique({ where: { id: booking.menuId } }) : null))?.freeEvery;
    const calc = computeBooking({ pax, priceCents: price, freeEvery, extrasCents: extras, commissionRate: rate });
    if (calc.totalCents < booking.paidCents) return { error: "Il nuovo totale è inferiore a quanto già incassato: gestisci prima un rimborso." };
    const date = parseDay(d.date) ?? booking.date;
    if (date.getTime() !== booking.date.getTime()) changes.push(`data ${d.date}`);
    if (pax !== booking.pax) changes.push(`persone ${booking.pax}→${pax}`);
    if (price !== booking.priceCents) changes.push(`prezzo ${(price / 100).toFixed(2)} €`);
    data = {
      ...groupFields,
      contactEmail: d.contactEmail,
      date,
      time: d.time ?? booking.time,
      pax,
      menuId: menu?.id ?? booking.menuId,
      priceCents: price,
      extrasCents: extras,
      freePax: calc.freePax,
      totalCents: calc.totalCents,
      commissionRate: rate,
      commissionCents: calc.commissionCents,
      internalNotes: d.internalNotes,
      paymentMode: d.paymentMode ?? booking.paymentMode,
      depositPercent: d.depositPercent ?? booking.depositPercent,
      paymentStatus: booking.paidCents >= calc.totalCents ? "PAID" : booking.paidCents > 0 ? "PARTIAL" : "UNPAID",
    };
  }
  await db.booking.update({ where: { id: booking.id }, data });
  await logEvent({ entityType: "booking", entityId: booking.id, action: "updated", userId: user.id, summary: `Prenotazione modificata${changes.length ? `: ${changes.join(", ")}` : ""}` });
  refresh(booking.code);
  return { ok: "Modifiche salvate" };
}

/** Avvia il pagamento online (organizzatore o staff per conto del cliente). */
export async function payAction(bookingId: string, returnPath: string): Promise<{ error?: string } | void> {
  const { booking, role } = await load(bookingId);
  if (role !== "admin" && role !== "organizer") return { error: "Non autorizzato" };
  if (!stripeEnabled()) return { error: "Pagamenti online non ancora attivi: contatta ForGroups per pagare con bonifico." };
  let url: string;
  try {
    url = await createBookingCheckout(booking.id, returnPath);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  redirect(url);
}

/** Link di pagamento da inviare al cliente (staff) */
export async function paymentLinkAction(bookingId: string): Promise<{ url?: string; error?: string }> {
  const { role } = await load(bookingId);
  if (role !== "admin") return { error: "Non autorizzato" };
  if (!stripeEnabled()) return { error: "Stripe non configurato: aggiungi STRIPE_SECRET_KEY." };
  try {
    const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    return { url: await createBookingCheckout(bookingId, `/area/prenotazioni/${b.code}`) };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function manualPaymentAction(_: FormState, form: FormData): Promise<FormState> {
  const bookingId = String(form.get("bookingId"));
  const amount = Math.round(Number(String(form.get("amount")).replace(",", ".")) * 100);
  const method = String(form.get("method") || "bonifico");
  if (!amount || amount <= 0) return { error: "Importo non valido" };
  const { user, booking, role } = await load(bookingId);
  if (role !== "admin") return { error: "Non autorizzato" };
  await db.$transaction([
    db.payment.create({ data: { bookingId, kind: "manual", method, amountCents: amount, status: "SUCCEEDED", paidAt: new Date() } }),
    db.booking.update({
      where: { id: bookingId },
      data: { paidCents: { increment: amount }, paymentStatus: booking.paidCents + amount >= booking.totalCents ? "PAID" : "PARTIAL" },
    }),
  ]);
  await logEvent({ entityType: "booking", entityId: bookingId, action: "payment_manual", userId: user.id, summary: `Incasso registrato a mano: ${(amount / 100).toFixed(2)} € (${method})` });
  refresh(booking.code);
  return { ok: "Incasso registrato" };
}
