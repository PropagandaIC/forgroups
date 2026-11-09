import { db } from "@/lib/db";
import { Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { ColumnChart, RankBars } from "@/components/charts";
import { addDays, isoDay, money, money0, n, parseDay } from "@/lib/format";
import { INQUIRY_STAGE, ORGANIZER_TYPES } from "@/lib/labels";
import type { InquiryStage, OrganizerType } from "@prisma/client";

export default async function Statistiche({ searchParams }: { searchParams: Promise<{ dal?: string; al?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  const from = parseDay(sp.dal) ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const to = parseDay(sp.al) ?? addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)), -1);
  const range = { date: { gte: from, lte: to } };
  const ok = { status: { in: ["CONFIRMED", "COMPLETED"] as ("CONFIRMED" | "COMPLETED")[] } };

  const [bookings, agg, cancelled, all, inquiries] = await Promise.all([
    db.booking.findMany({ where: { ...range, ...ok }, select: { date: true, totalCents: true, pax: true, restaurantId: true, organizerId: true, commissionCents: true } }),
    db.booking.aggregate({ where: { ...range, ...ok }, _sum: { totalCents: true, commissionCents: true, pax: true }, _count: true }),
    db.booking.count({ where: { ...range, status: { in: ["CANCELLED", "DECLINED", "NO_SHOW"] } } }),
    db.booking.count({ where: range }),
    db.inquiry.groupBy({ by: ["stage"], where: { createdAt: { gte: from, lte: addDays(to, 1) } }, _count: true }),
  ]);
  const orgs = await db.organization.findMany({
    where: { id: { in: [...new Set(bookings.flatMap((b) => [b.restaurantId, b.organizerId ?? ""]))] } },
    select: { id: true, name: true, city: true, organizerType: true },
  });
  const org = new Map(orgs.map((o) => [o.id, o]));

  const sumBy = (key: (b: (typeof bookings)[number]) => string | null) => {
    const m = new Map<string, { value: number; pax: number; count: number }>();
    for (const b of bookings) {
      const k = key(b);
      if (!k) continue;
      const x = m.get(k) ?? { value: 0, pax: 0, count: 0 };
      x.value += b.totalCents;
      x.pax += b.pax;
      x.count++;
      m.set(k, x);
    }
    return [...m.entries()].sort((a, b) => b[1].value - a[1].value);
  };
  const months: { label: string; value: number; key: string; count: number }[] = [];
  for (let d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1)); d <= to; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)))
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }), value: 0, count: 0 });
  for (const b of bookings) {
    const m = months.find((x) => x.key === b.date.toISOString().slice(0, 7));
    if (m) {
      m.value += b.totalCents;
      m.count++;
    }
  }
  const stage = (s: InquiryStage) => inquiries.find((x) => x.stage === s)?._count ?? 0;
  const closed = stage("WON") + stage("LOST");

  return (
    <>
      <PageHeader
        title="Statistiche"
        subtitle="Prenotazioni confermate o servite, per data di servizio"
        actions={
          <form className="flex items-end gap-2">
            <label><span className="label">Dal</span><input type="date" name="dal" defaultValue={isoDay(from)} className="input" /></label>
            <label><span className="label">Al</span><input type="date" name="al" defaultValue={isoDay(to)} className="input" /></label>
            <button className="h-9 rounded-lg bg-ink-900 px-3 text-sm font-medium text-white">Aggiorna</button>
          </form>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Valore prenotato" value={money0(agg._sum.totalCents)} accent />
        <Stat label="Provvigioni" value={money0(agg._sum.commissionCents)} />
        <Stat label="Gruppi · coperti" value={`${n(agg._count)} · ${n(agg._sum.pax)}`} />
        <Stat label="Spesa media a persona" value={money(agg._sum.pax ? Math.round((agg._sum.totalCents ?? 0) / agg._sum.pax) : 0)} />
        <Stat label="Annullate / rifiutate / no show" value={`${all ? Math.round((cancelled / all) * 100) : 0}%`} hint={`${n(cancelled)} su ${n(all)}`} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Valore prenotato per mese" />
        <div className="px-5 pt-8 pb-5"><ColumnChart label="Valore per mese" data={months.map((m) => ({ label: m.label, value: m.value, sub: `${m.count} gruppi` }))} format={money0} /></div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ristoranti per fatturato" subtitle="Primi 10" />
          <div className="p-5">
            <RankBars items={sumBy((b) => b.restaurantId).slice(0, 10).map(([id, x]) => ({ label: org.get(id)?.name ?? "—", value: x.value, display: money0(x.value), hint: `${n(x.pax)} cop.`, href: `/admin/ristoranti/${id}` }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Agenzie e clienti per fatturato" subtitle="Primi 10" />
          <div className="p-5">
            <RankBars items={sumBy((b) => b.organizerId).slice(0, 10).map(([id, x]) => ({ label: org.get(id)?.name ?? "—", value: x.value, display: money0(x.value), hint: `${n(x.count)} gruppi`, href: `/admin/organizzatori/${id}` }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Città" />
          <div className="p-5">
            <RankBars items={sumBy((b) => org.get(b.restaurantId)?.city ?? null).map(([city, x]) => ({ label: city, value: x.value, display: money0(x.value), hint: `${n(x.pax)} cop.` }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Tipo di cliente" />
          <div className="p-5">
            <RankBars items={sumBy((b) => (b.organizerId ? (org.get(b.organizerId)?.organizerType ?? null) : "PRIVATO")).map(([t, x]) => ({ label: ORGANIZER_TYPES[t as OrganizerType] ?? t, value: x.value, display: money0(x.value), hint: `${n(x.count)} gruppi` }))} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Richieste → prenotazioni" subtitle={`Richieste arrivate nel periodo · conversione sulle chiuse: ${closed ? Math.round((stage("WON") / closed) * 100) : 0}%`} />
          <div className="grid gap-px bg-ink-100 sm:grid-cols-5">
            {(Object.keys(INQUIRY_STAGE) as InquiryStage[]).map((s) => (
              <div key={s} className="bg-white p-4">
                <div className="text-xs text-ink-500">{INQUIRY_STAGE[s].label}</div>
                <div className="text-2xl font-semibold">{n(stage(s))}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
