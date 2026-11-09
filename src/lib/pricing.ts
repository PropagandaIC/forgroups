import type { PaymentMode } from "@prisma/client";

/** Gratuità: 1 posto gratis ogni `freeEvery` paganti (es. capogruppo/autista). */
export function freePlaces(pax: number, freeEvery?: number | null) {
  if (!freeEvery || freeEvery <= 0) return 0;
  return Math.floor(pax / (freeEvery + 1));
}

export function computeBooking(input: {
  pax: number;
  priceCents: number;
  freeEvery?: number | null;
  extrasCents?: number;
  commissionRate: number; // punti base
}) {
  const freePax = freePlaces(input.pax, input.freeEvery);
  const paying = Math.max(0, input.pax - freePax);
  const totalCents = paying * input.priceCents + (input.extrasCents ?? 0);
  const commissionCents = Math.round((totalCents * input.commissionRate) / 10000);
  return { freePax, paying, totalCents, commissionCents, restaurantCents: totalCents - commissionCents };
}

/**
 * Quanto chiedere ora all'organizzatore e quanta parte trattenere come provvigione.
 * La provvigione viene incassata per prima: con l'acconto ForGroups è già coperta.
 */
export function amountDue(b: {
  totalCents: number;
  paidCents: number;
  commissionCents: number;
  feesCollectedCents: number;
  paymentMode: PaymentMode;
  depositPercent?: number | null;
}): { kind: "full" | "deposit" | "balance"; amountCents: number; feeCents: number } | null {
  const remaining = b.totalCents - b.paidCents;
  if (remaining <= 0) return null;
  let kind: "full" | "deposit" | "balance";
  let amount: number;
  if (b.paymentMode === "ONLINE_DEPOSIT" && b.paidCents === 0) {
    kind = "deposit";
    const pctDeposit = Math.min(100, Math.max(1, b.depositPercent ?? 30));
    amount = Math.max(Math.round((b.totalCents * pctDeposit) / 100), Math.min(b.commissionCents, remaining));
  } else if (b.paymentMode === "ONLINE_FULL" || b.paymentMode === "ONLINE_DEPOSIT") {
    kind = b.paidCents > 0 ? "balance" : "full";
    amount = remaining;
  } else {
    return null; // sul posto / bonifico: niente incasso online
  }
  amount = Math.min(amount, remaining);
  const feeLeft = Math.max(0, b.commissionCents - b.feesCollectedCents);
  return { kind, amountCents: amount, feeCents: Math.min(feeLeft, amount) };
}
