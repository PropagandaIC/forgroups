import Link from "next/link";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { commissionsFor, currentPeriod, lastPeriods, periodLabel } from "@/lib/commissions";
import { money, money0, n, stamp } from "@/lib/format";

export default async function Pagamenti({ searchParams }: { searchParams: Promise<{ mese?: string }> }) {
  const { mese } = await searchParams;
  const period = mese && /^\d{4}-\d{2}$/.test(mese) ? mese : currentPeriod();
  const [rows, recent] = await Promise.all([
    commissionsFor(period),
    db.payment.findMany({ where: { status: { in: ["SUCCEEDED", "PENDING", "FAILED"] } }, orderBy: { createdAt: "desc" }, take: 15, include: { booking: { include: { restaurant: true } } } }),
  ]);
  const tot = rows.reduce((s, r) => ({ total: s.total + r.total, commission: s.commission + r.commission, withheld: s.withheld + r.withheld, toInvoice: s.toInvoice + r.toInvoice }), { total: 0, commission: 0, withheld: 0, toInvoice: 0 });
  return (
    <>
      <PageHeader
        title="Incassi e provvigioni"
        subtitle={`Prenotazioni servite a ${periodLabel(period)}`}
        actions={
          <>
            <form className="flex gap-2">
              <select name="mese" defaultValue={period} className="input w-auto">
                {lastPeriods().map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
              </select>
              <button className="h-9 rounded-lg bg-ink-900 px-3 text-sm font-medium text-white">Vai</button>
            </form>
            <a href={`/api/export/provvigioni?mese=${period}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 text-sm font-medium shadow-sm hover:bg-ink-50"><Download className="size-4" /> CSV per il commercialista</a>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Valore servito" value={money0(tot.total)} accent />
        <Stat label="Provvigioni maturate" value={money0(tot.commission)} />
        <Stat label="Già trattenute con Stripe" value={money0(tot.withheld)} hint="nessuna fattura da incassare" />
        <Stat label="Da fatturare ai ristoranti" value={money0(tot.toInvoice)} hint="prenotazioni pagate sul posto" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader title="Per ristorante" subtitle="La provvigione delle prenotazioni pagate online è già trattenuta; il resto va fatturato a fine mese" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/60 text-left text-xs text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ristorante</th>
                  <th className="px-4 py-2.5 text-right font-medium">Gruppi</th>
                  <th className="px-4 py-2.5 text-right font-medium">Servito</th>
                  <th className="px-4 py-2.5 text-right font-medium">Provvigione</th>
                  <th className="px-4 py-2.5 text-right font-medium">Trattenuta</th>
                  <th className="px-4 py-2.5 text-right font-medium">Da fatturare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-500">Nessuna prenotazione nel mese.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.restaurant.id}>
                    <td className="px-4 py-2.5"><Link href={`/admin/ristoranti/${r.restaurant.id}?tab=pagamenti`} className="font-medium hover:underline">{r.restaurant.name}</Link><div className="text-xs text-ink-500">{r.restaurant.billingName ?? "dati fatturazione mancanti"}{r.restaurant.vatNumber ? ` · P.IVA ${r.restaurant.vatNumber}` : ""}</div></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{n(r.count)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{money(r.total)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{money(r.commission)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700 tabular-nums">{money(r.withheld)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{r.toInvoice ? money(r.toInvoice) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Ultimi pagamenti online" />
          <ul className="divide-y divide-ink-100 text-sm">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/prenotazioni/${p.booking.code}`} className="block px-5 py-2.5 hover:bg-ink-50">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{p.booking.restaurant.name}</span>
                    <span className="font-medium tabular-nums">{money(p.amountCents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink-500">
                    <span>{p.booking.code} · {stamp(p.paidAt ?? p.createdAt)} · {p.method}</span>
                    <Badge tone={p.status === "SUCCEEDED" ? "green" : p.status === "PENDING" ? "amber" : "red"} dot={false}>{p.status === "SUCCEEDED" ? "ok" : p.status === "PENDING" ? "in attesa" : "fallito"}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
