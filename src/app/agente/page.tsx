import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { agentStatement } from "@/lib/agents";
import { currentPeriod, lastPeriods, periodLabel } from "@/lib/commissions";
import { Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { addDays, money, money0, n, pct } from "@/lib/format";

export default async function Agente({ searchParams }: { searchParams: Promise<{ mese?: string }> }) {
  const user = await requireUser(["AGENT"]);
  const { mese } = await searchParams;
  const period = mese && /^\d{4}-\d{2}$/.test(mese) ? mese : currentPeriod();
  const [[s], restaurants] = await Promise.all([
    agentStatement(period, user.id),
    db.organization.findMany({ where: { agentId: user.id }, orderBy: { name: "asc" } }),
  ]);
  const year = await db.booking.groupBy({
    by: ["restaurantId"],
    where: { restaurantId: { in: restaurants.map((r) => r.id) }, status: { in: ["CONFIRMED", "COMPLETED"] }, date: { gte: addDays(new Date(), -365) } },
    _sum: { totalCents: true, pax: true },
  });
  return (
    <>
      <PageHeader
        title="I miei ristoranti"
        subtitle={`Rendiconto di ${periodLabel(period)}`}
        actions={
          <form className="flex gap-2">
            <select name="mese" defaultValue={period} className="input w-auto">{lastPeriods().map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}</select>
            <button className="h-9 rounded-lg bg-ink-900 px-3 text-sm font-medium text-white">Vai</button>
          </form>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="La tua commissione" value={money(s?.due ?? 0)} hint={s?.payout?.paid ? "pagata" : "da liquidare"} accent />
        <Stat label="Fatturato dei tuoi ristoranti" value={money0(s?.revenue ?? 0)} />
        <Stat label="Quota sulla provvigione" value={pct(s?.share ?? 2000)} />
      </div>
      <Card className="mt-6">
        <CardHeader title="Ristoranti seguiti" subtitle="Fatturato e coperti ultimi 12 mesi" />
        <ul className="divide-y divide-ink-100 text-sm">
          {restaurants.map((r) => {
            const y = year.find((x) => x.restaurantId === r.id);
            return (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex-1 font-medium">{r.name} <span className="font-normal text-ink-500">· {r.city}</span></span>
                <Badge tone={r.stripeTransfersActive ? "green" : "amber"}>{r.stripeTransfersActive ? "Incassi online" : "Stripe da collegare"}</Badge>
                <span className="w-20 text-right tabular-nums">{n(y?._sum.pax)} cop.</span>
                <span className="w-24 text-right font-medium tabular-nums">{money0(y?._sum.totalCents)}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
