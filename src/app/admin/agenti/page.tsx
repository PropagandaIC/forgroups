import { Check } from "lucide-react";
import { Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { ActionButton } from "@/components/action-form";
import { agentStatement } from "@/lib/agents";
import { currentPeriod, lastPeriods, periodLabel } from "@/lib/commissions";
import { money, money0, n, pct } from "@/lib/format";
import { setAgentShareAction, toggleAgentPaidAction } from "@/app/actions/agents";

export default async function Agenti({ searchParams }: { searchParams: Promise<{ mese?: string }> }) {
  const { mese } = await searchParams;
  const period = mese && /^\d{4}-\d{2}$/.test(mese) ? mese : currentPeriod();
  const rows = await agentStatement(period);
  const totalDue = rows.reduce((s, r) => s + r.due, 0);
  return (
    <>
      <PageHeader
        title="Agenti"
        subtitle={`Rendiconto di ${periodLabel(period)}: la commissione è una quota della provvigione ForGroups sui ristoranti seguiti`}
        actions={
          <form className="flex gap-2">
            <select name="mese" defaultValue={period} className="input w-auto">{lastPeriods().map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}</select>
            <button className="h-9 rounded-lg bg-ink-900 px-3 text-sm font-medium text-white">Vai</button>
          </form>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Commissioni agenti del mese" value={money0(totalDue)} accent />
        <Stat label="Agenti attivi" value={n(rows.filter((r) => r.agent.status === "ACTIVE").length)} />
        <Stat label="Già pagate" value={money0(rows.filter((r) => r.payout?.paid).reduce((s, r) => s + (r.payout?.amountCents ?? 0), 0))} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.agent.id}>
            <CardHeader
              title={r.agent.name}
              subtitle={`${r.restaurants} ristoranti seguiti · ${r.agent.email}`}
              action={r.payout?.paid ? <Badge tone="green">Pagata</Badge> : r.due > 0 ? <Badge tone="amber">Da pagare</Badge> : null}
            />
            <div className="grid grid-cols-3 gap-px bg-ink-100 text-sm">
              <div className="bg-white p-4"><div className="text-xs text-ink-500">Fatturato ristoranti</div><div className="font-semibold">{money0(r.revenue)}</div></div>
              <div className="bg-white p-4"><div className="text-xs text-ink-500">Provvigione ForGroups</div><div className="font-semibold">{money0(r.commission)}</div></div>
              <div className="bg-white p-4"><div className="text-xs text-ink-500">Commissione agente ({pct(r.share)})</div><div className="text-lg font-semibold">{money(r.due)}</div></div>
            </div>
            {r.perRestaurant.length > 0 && (
              <ul className="divide-y divide-ink-100 px-5 py-2 text-sm">
                {r.perRestaurant.map((x) => (
                  <li key={x.name} className="flex justify-between py-1.5"><span>{x.name} <span className="text-ink-500">· {x.count} gruppi</span></span><span className="tabular-nums">{money(x.commission)}</span></li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-3">
              <form action={setAgentShareAction.bind(null, r.agent.id)} className="flex items-center gap-2 text-sm">
                <span className="text-ink-500">Quota</span>
                <input name="share" defaultValue={r.share / 100} className="input h-8 w-16" />
                <span className="text-ink-500">%</span>
                <button className="text-xs font-medium text-brand-700 hover:underline">Aggiorna</button>
              </form>
              {r.due > 0 && (
                <ActionButton run={toggleAgentPaidAction.bind(null, r.agent.id, period)} size="sm" variant={r.payout?.paid ? "ghost" : "dark"}>
                  {r.payout?.paid ? "Annulla pagamento" : <><Check className="size-3.5" /> Segna come pagata</>}
                </ActionButton>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
