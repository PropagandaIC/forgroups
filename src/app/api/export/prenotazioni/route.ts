import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { bookingWhere } from "@/lib/booking-filters";
import { BOOKING_STATUS, PAYMENT_MODE, PAYMENT_STATUS } from "@/lib/labels";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/** CSV con separatore ";" e BOM: si apre direttamente in Excel italiano. */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (user?.role !== "ADMIN") return new NextResponse("Non autorizzato", { status: 401 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { where, orderBy } = bookingWhere(sp);
  const rows = await db.booking.findMany({ where, orderBy, include: { restaurant: true, organizer: true, menu: true }, take: 20000 });
  const header = ["Codice", "Data", "Ora", "Ristorante", "Città", "Cliente", "Referente", "Gruppo", "Tipo gruppo", "Persone", "Gratuità", "Menu", "Prezzo p.p.", "Totale", "Provvigione", "Incassato", "Stato", "Pagamento", "Stato pagamento"];
  const lines = rows.map((b) =>
    [
      b.code, b.date.toISOString().slice(0, 10), b.time, b.restaurant.name, b.restaurant.city, b.organizer?.name ?? "", b.contactName, b.groupName, b.groupType,
      b.pax, b.freePax, b.menu?.name, eur(b.priceCents), eur(b.totalCents), eur(b.commissionCents), eur(b.paidCents),
      BOOKING_STATUS[b.status].label, PAYMENT_MODE[b.paymentMode], PAYMENT_STATUS[b.paymentStatus].label,
    ].map(cell).join(";"),
  );
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prenotazioni-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
