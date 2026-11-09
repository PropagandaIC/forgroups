import Link from "next/link";
import { Download, Plus, Search, Ticket } from "lucide-react";
import { db } from "@/lib/db";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { day, money, money0, n } from "@/lib/format";
import { BOOKING_STATUS, PAYMENT_STATUS } from "@/lib/labels";
import { bookingWhere, VIEWS, type View } from "@/lib/booking-filters";

const PAGE = 50;

export default async function Prenotazioni({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const view = (sp.vista as View) in VIEWS ? (sp.vista as View) : "prossime";
  const page = Math.max(1, Number(sp.pagina) || 1);
  const { where, orderBy } = bookingWhere(sp);
  const [rows, agg, counts] = await Promise.all([
    db.booking.findMany({ where, orderBy, skip: (page - 1) * PAGE, take: PAGE, include: { restaurant: true, organizer: true, menu: true } }),
    db.booking.aggregate({ where, _sum: { totalCents: true, pax: true, commissionCents: true, paidCents: true }, _count: true }),
    Promise.all(
      (Object.keys(VIEWS) as View[]).map(async (v) => [v, await db.booking.count({ where: bookingWhere({ vista: v }).where })] as const),
    ),
  ]);
  const countMap = Object.fromEntries(counts);
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `?${u}`;
  };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Prenotazioni"
        subtitle={`${n(agg._count)} prenotazioni · ${money0(agg._sum.totalCents)} · ${n(agg._sum.pax)} coperti · provvigioni ${money0(agg._sum.commissionCents)}`}
        actions={
          <>
            <a href={`/api/export/prenotazioni?${exportQs}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 text-sm font-medium shadow-sm hover:bg-ink-50">
              <Download className="size-4" /> Esporta CSV
            </a>
            <LinkButton href="/admin/prenotazioni/nuova" variant="primary"><Plus className="size-4" /> Nuova</LinkButton>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1 text-sm font-medium">
        {(Object.entries(VIEWS) as [View, string][]).map(([k, label]) => (
          <Link key={k} href={qs({ vista: k, pagina: undefined })} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition ${view === k ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"}`}>
            {label}
            <span className={`rounded-full px-1.5 text-[11px] ${view === k ? "bg-brand-100 text-brand-800" : "bg-ink-200/70 text-ink-500"}`}>{n(countMap[k])}</span>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="vista" value={view} />
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-ink-400" />
          <input name="q" defaultValue={sp.q} placeholder="Codice, gruppo, cliente, ristorante…" className="input pl-9" />
        </label>
        <label>
          <span className="label">Dal</span>
          <input type="date" name="dal" defaultValue={sp.dal} className="input" />
        </label>
        <label>
          <span className="label">Al</span>
          <input type="date" name="al" defaultValue={sp.al} className="input" />
        </label>
        <select name="stato" defaultValue={sp.stato ?? ""} className="input w-auto">
          <option value="">Tutti gli stati</option>
          {Object.entries(BOOKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="h-9 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white">Filtra</button>
      </form>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty icon={<Ticket className="size-5" />} title="Nessuna prenotazione">Cambia vista o filtri.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/60 text-left text-xs text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Quando</th>
                  <th className="px-4 py-2.5 font-medium">Ristorante</th>
                  <th className="px-4 py-2.5 font-medium">Cliente / gruppo</th>
                  <th className="px-4 py-2.5 text-right font-medium">Pers.</th>
                  <th className="px-4 py-2.5 text-right font-medium">Importo</th>
                  <th className="px-4 py-2.5 font-medium">Stato</th>
                  <th className="px-4 py-2.5 font-medium">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((b) => (
                  <tr key={b.id} className="group relative hover:bg-brand-50/40">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/admin/prenotazioni/${b.code}`} className="absolute inset-0" aria-label={`Apri ${b.code}`} />
                      <div className="font-medium">{day(b.date)} · {b.time}</div>
                      <div className="text-xs text-ink-500">{b.code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.restaurant.name}</div>
                      <div className="text-xs text-ink-500">{b.restaurant.city} · {b.menu?.name ?? "Menu da definire"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{b.organizer?.name ?? b.contactName}</div>
                      <div className="text-xs text-ink-500">{b.groupName ?? b.groupType ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{b.pax}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="font-medium">{money(b.totalCents)}</div>
                      <div className="text-xs text-ink-500">{money(b.priceCents)} p.p.</div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge></td>
                    <td className="px-4 py-3">
                      {b.paymentMode === "ON_SITE" ? (
                        <span className="text-xs text-ink-500">Sul posto</span>
                      ) : (
                        <Badge tone={PAYMENT_STATUS[b.paymentStatus].tone}>{PAYMENT_STATUS[b.paymentStatus].label}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {agg._count > PAGE && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <LinkButton href={qs({ pagina: String(page - 1) })} size="sm">← Precedenti</LinkButton>}
          <span className="px-3 text-ink-500">Pagina {page} di {Math.ceil(agg._count / PAGE)}</span>
          {page * PAGE < agg._count && <LinkButton href={qs({ pagina: String(page + 1) })} size="sm">Successive →</LinkButton>}
        </div>
      )}
    </>
  );
}
