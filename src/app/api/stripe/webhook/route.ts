import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, markCheckoutFailed, markCheckoutPaid } from "@/lib/stripe";

/**
 * Webhook Stripe: è la fonte di verità per i pagamenti.
 * Eventi da abilitare: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new NextResponse("Webhook non configurato", { status: 500 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new NextResponse("Firma non valida", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object;
      // con metodi a notifica differita la sessione può essere completata ma non ancora pagata
      if (s.payment_status !== "unpaid") {
        const pi = typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);
        await markCheckoutPaid(s.id, pi);
      }
      break;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      await markCheckoutFailed(event.data.object.id);
      break;
  }
  return NextResponse.json({ received: true });
}
