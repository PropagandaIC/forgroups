import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { commissionsFor, currentPeriod } from "@/lib/commissions";

const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (user?.role !== "ADMIN") return new NextResponse("Non autorizzato", { status: 401 });
  const period = req.nextUrl.searchParams.get("mese") ?? currentPeriod();
  const rows = await commissionsFor(period);
  const header = ["Ristorante", "Ragione sociale", "P.IVA", "Codice SDI", "PEC", "Gruppi", "Coperti", "Servito", "Provvigione", "Trattenuta online", "Da fatturare (imponibile)", "IVA 22%", "Totale fattura"];
  const lines = rows.map((r) =>
    [r.restaurant.name, r.restaurant.billingName, r.restaurant.vatNumber, r.restaurant.sdiCode, r.restaurant.pec, r.count, r.pax, eur(r.total), eur(r.commission), eur(r.withheld), eur(r.toInvoice), eur(Math.round(r.toInvoice * 0.22)), eur(Math.round(r.toInvoice * 1.22))]
      .map(cell)
      .join(";"),
  );
  return new NextResponse("﻿" + [header.join(";"), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="provvigioni-${period}.csv"` },
  });
}
