import { db } from "./db";

export function monthRange(period: string) {
  const [y, m] = period.split("-").map(Number);
  return { from: new Date(Date.UTC(y!, m! - 1, 1)), to: new Date(Date.UTC(y!, m!, 1)) };
}
export const currentPeriod = () => new Date().toISOString().slice(0, 7);
export function lastPeriods(k = 18) {
  const now = new Date();
  return Array.from({ length: k }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
}
export const periodLabel = (p: string) => new Date(`${p}-01T00:00:00Z`).toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

/** Provvigioni per ristorante nel mese di servizio: trattenute online vs da fatturare. */
export async function commissionsFor(period: string) {
  const { from, to } = monthRange(period);
  const bookings = await db.booking.findMany({
    where: { date: { gte: from, lt: to }, status: { in: ["CONFIRMED", "COMPLETED"] } },
    include: { restaurant: true, payments: { where: { status: "SUCCEEDED" } } },
  });
  const rows = new Map<string, { restaurant: (typeof bookings)[number]["restaurant"]; count: number; pax: number; total: number; commission: number; withheld: number }>();
  for (const b of bookings) {
    const r = rows.get(b.restaurantId) ?? { restaurant: b.restaurant, count: 0, pax: 0, total: 0, commission: 0, withheld: 0 };
    r.count++;
    r.pax += b.pax;
    r.total += b.totalCents;
    r.commission += b.commissionCents;
    r.withheld += b.payments.reduce((s, p) => s + p.applicationFeeCents, 0);
    rows.set(b.restaurantId, r);
  }
  return [...rows.values()].map((r) => ({ ...r, toInvoice: Math.max(0, r.commission - r.withheld) })).sort((a, b) => b.commission - a.commission);
}
