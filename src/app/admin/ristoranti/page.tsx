import Link from "next/link";
import { Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Badge, Card, Cover, PageHeader } from "@/components/ui";
import { activeCities } from "@/lib/queries";
import { addDays, money0, n, pct } from "@/lib/format";

export default async function Ristoranti({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const where: Prisma.OrganizationWhereInput = { kind: "RESTAURANT" };
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { vatNumber: { contains: sp.q } }];
  if (sp.citta) where.citySlug = sp.citta;
  if (sp.stato) where.status = sp.stato as Prisma.EnumStatusFilter["equals"];
  if (sp.stripe === "no") Object.assign(where, { stripeTransfersActive: false, status: "ACTIVE" });
  const [list, cities] = await Promise.all([db.organization.findMany({ where, orderBy: { name: "asc" }, include: { agent: true } }), activeCities()]);
  const stats = await db.booking.groupBy({
    by: ["restaurantId"],
    where: { restaurantId: { in: list.map((r) => r.id) }, status: { in: ["CONFIRMED", "COMPLETED"] }, date: { gte: addDays(new Date(), -365) } },
    _sum: { totalCents: true, pax: true },
    _count: true,
  });
  const byId = new Map(stats.map((s) => [s.restaurantId, s]));
  const sorted = sp.ordina === "fatturato" ? [...list].sort((a, b) => (byId.get(b.id)?._sum.totalCents ?? 0) - (byId.get(a.id)?._sum.totalCents ?? 0)) : list;

  return (
    <>
      <PageHeader title="Ristoranti" subtitle={`${list.length} locali · fatturato e coperti degli ultimi 12 mesi`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-ink-400" />
          <input name="q" defaultValue={sp.q} placeholder="Nome, email, partita IVA…" className="input pl-9" />
        </label>
        <select name="citta" defaultValue={sp.citta ?? ""} className="input w-auto">
          <option value="">Tutte le città</option>
          {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="stato" defaultValue={sp.stato ?? ""} className="input w-auto">
          <option value="">Tutti gli stati</option>
          <option value="ACTIVE">Attivi</option>
          <option value="PENDING">Da approvare</option>
          <option value="DISABLED">Disattivati</option>
        </select>
        <select name="ordina" defaultValue={sp.ordina ?? ""} className="input w-auto">
          <option value="">Ordina per nome</option>
          <option value="fatturato">Ordina per fatturato</option>
        </select>
        <button className="h-9 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white">Filtra</button>
      </form>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-left text-xs text-ink-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Ristorante</th>
                <th className="px-4 py-2.5 font-medium">Stato</th>
                <th className="px-4 py-2.5 font-medium">Incassi online</th>
                <th className="px-4 py-2.5 text-right font-medium">Provv.</th>
                <th className="px-4 py-2.5 text-right font-medium">Gruppi</th>
                <th className="px-4 py-2.5 text-right font-medium">Coperti</th>
                <th className="px-4 py-2.5 text-right font-medium">Fatturato</th>
                <th className="px-4 py-2.5 font-medium">Agente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {sorted.map((r) => {
                const s = byId.get(r.id);
                return (
                  <tr key={r.id} className="relative hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/ristoranti/${r.id}`} className="absolute inset-0" aria-label={r.name} />
                      <div className="flex items-center gap-3">
                        <Cover name={r.name} src={r.coverImage} className="size-10 shrink-0 rounded-lg" />
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-ink-500">{r.city} · max {r.maxCapacity ?? "?"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={r.status === "ACTIVE" ? "green" : r.status === "PENDING" ? "violet" : "gray"}>{r.status === "ACTIVE" ? "Attivo" : r.status === "PENDING" ? "Da approvare" : "Disattivato"}</Badge></td>
                    <td className="px-4 py-3">{r.stripeTransfersActive ? <Badge tone="green">Attivi</Badge> : <Badge tone="amber">{r.stripeAccountId ? "In verifica" : "Da collegare"}</Badge>}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{pct(r.commissionRate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{n(s?._count)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{n(s?._sum.pax)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{money0(s?._sum.totalCents)}</td>
                    <td className="px-4 py-3 text-ink-600">{r.agent?.name ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
