import Link from "next/link";
import { Search } from "lucide-react";
import type { OrganizerType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { day, money0, n } from "@/lib/format";
import { ORGANIZER_TYPES } from "@/lib/labels";

export default async function Organizzatori({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const where: Prisma.OrganizationWhereInput = { kind: "ORGANIZER" };
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { city: { contains: sp.q, mode: "insensitive" } }];
  if (sp.tipo) where.organizerType = sp.tipo as OrganizerType;
  if (sp.stato) where.status = sp.stato as Prisma.EnumStatusFilter["equals"];
  const list = await db.organization.findMany({ where, orderBy: [{ status: "desc" }, { name: "asc" }], include: { _count: { select: { members: true } } } });
  const stats = await db.booking.groupBy({
    by: ["organizerId"],
    where: { organizerId: { in: list.map((o) => o.id) }, status: { in: ["CONFIRMED", "COMPLETED"] } },
    _sum: { totalCents: true, pax: true },
    _count: true,
    _max: { date: true },
  });
  const byId = new Map(stats.map((s) => [s.organizerId, s]));
  return (
    <>
      <PageHeader title="Agenzie e clienti" subtitle={`${list.length} organizzatori · ${list.filter((o) => o.status === "PENDING").length} da approvare`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-ink-400" />
          <input name="q" defaultValue={sp.q} placeholder="Nome, email, città…" className="input pl-9" />
        </label>
        <select name="tipo" defaultValue={sp.tipo ?? ""} className="input w-auto">
          <option value="">Tutti i tipi</option>
          {Object.entries(ORGANIZER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="stato" defaultValue={sp.stato ?? ""} className="input w-auto">
          <option value="">Tutti gli stati</option>
          <option value="PENDING">Da approvare</option>
          <option value="ACTIVE">Attivi</option>
          <option value="DISABLED">Disattivati</option>
        </select>
        <button className="h-9 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white">Filtra</button>
      </form>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-left text-xs text-ink-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Organizzatore</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Stato</th>
                <th className="px-4 py-2.5 text-right font-medium">Prenotazioni</th>
                <th className="px-4 py-2.5 text-right font-medium">Coperti</th>
                <th className="px-4 py-2.5 text-right font-medium">Valore</th>
                <th className="px-4 py-2.5 font-medium">Ultimo servizio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {list.map((o) => {
                const s = byId.get(o.id);
                return (
                  <tr key={o.id} className="relative hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/organizzatori/${o.id}`} className="absolute inset-0" aria-label={o.name} />
                      <div className="font-medium">{o.name}</div>
                      <div className="text-xs text-ink-500">{o.city} · {o._count.members} utenti</div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{o.organizerType ? ORGANIZER_TYPES[o.organizerType] : "—"}</td>
                    <td className="px-4 py-3"><Badge tone={o.status === "ACTIVE" ? "green" : o.status === "PENDING" ? "violet" : "gray"}>{o.status === "ACTIVE" ? "Attivo" : o.status === "PENDING" ? "Da approvare" : "Disattivato"}</Badge></td>
                    <td className="px-4 py-3 text-right tabular-nums">{n(s?._count)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{n(s?._sum.pax)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{money0(s?._sum.totalCents)}</td>
                    <td className="px-4 py-3 text-ink-600">{s?._max.date ? day(s._max.date) : "—"}</td>
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
