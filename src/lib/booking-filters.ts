import type { Prisma } from "@prisma/client";
import { addDays, parseDay, todayUTC } from "./format";

export const VIEWS = {
  prossime: "Prossime",
  "da-confermare": "Da confermare",
  "da-incassare": "Da incassare",
  passate: "Passate",
  tutte: "Tutte",
} as const;
export type View = keyof typeof VIEWS;

export function bookingWhere(sp: Record<string, string | undefined>): { where: Prisma.BookingWhereInput; orderBy: Prisma.BookingOrderByWithRelationInput[] } {
  const view = (sp.vista as View) in VIEWS ? (sp.vista as View) : "prossime";
  const today = todayUTC();
  const where: Prisma.BookingWhereInput = {};
  let orderBy: Prisma.BookingOrderByWithRelationInput[] = [{ date: "asc" }, { time: "asc" }];
  if (view === "prossime") Object.assign(where, { date: { gte: today }, status: { in: ["REQUESTED", "CONFIRMED"] } });
  if (view === "da-confermare") Object.assign(where, { status: "REQUESTED" });
  if (view === "da-incassare") Object.assign(where, { status: { in: ["CONFIRMED", "COMPLETED"] }, paymentStatus: { in: ["UNPAID", "PARTIAL"] } });
  if (view === "passate") {
    Object.assign(where, { date: { lt: today } });
    orderBy = [{ date: "desc" }];
  }
  if (view === "tutte") orderBy = [{ date: "desc" }];

  const from = parseDay(sp.dal);
  const to = parseDay(sp.al);
  if (from || to) where.date = { ...(from && { gte: from }), ...(to && { lt: addDays(to, 1) }) };
  if (sp.stato) where.status = sp.stato as Prisma.EnumBookingStatusFilter["equals"];
  if (sp.ristorante) where.restaurantId = sp.ristorante;
  if (sp.cliente) where.organizerId = sp.cliente;
  if (sp.q) {
    const ci = { contains: sp.q, mode: "insensitive" as const };
    where.OR = [{ code: ci }, { contactName: ci }, { groupName: ci }, { restaurant: { name: ci } }, { organizer: { name: ci } }];
  }
  return { where, orderBy };
}
