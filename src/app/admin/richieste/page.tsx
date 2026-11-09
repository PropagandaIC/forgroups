import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { LinkButton, PageHeader } from "@/components/ui";
import { Kanban } from "@/components/kanban";
import { addDays, day, money0, relative } from "@/lib/format";

const SOURCES: Record<string, string> = { website: "sito", email: "email", phone: "telefono", ai: "email AI", portal: "portale" };

export default async function Richieste({ searchParams }: { searchParams: Promise<{ mie?: string }> }) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const since = addDays(new Date(), -60);
  const list = await db.inquiry.findMany({
    where: {
      OR: [{ stage: { in: ["NEW", "QUALIFIED", "QUOTED"] } }, { updatedAt: { gte: since } }],
      ...(sp.mie ? { assigneeId: user.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { assignee: true, _count: { select: { quoteOptions: true } } },
  });
  const [won, total] = await Promise.all([
    db.inquiry.count({ where: { stage: "WON", createdAt: { gte: addDays(new Date(), -90) } } }),
    db.inquiry.count({ where: { stage: { in: ["WON", "LOST"] }, createdAt: { gte: addDays(new Date(), -90) } } }),
  ]);
  return (
    <>
      <PageHeader
        title="Richieste e preventivi"
        subtitle={`Trascina le schede tra le colonne · conversione ultimi 90 giorni: ${total ? Math.round((won / total) * 100) : 0}%`}
        actions={
          <>
            <div className="flex rounded-lg bg-ink-100 p-1 text-sm font-medium">
              <Link href="?" className={`rounded-md px-3 py-1 ${!sp.mie ? "bg-white shadow-sm" : "text-ink-500"}`}>Tutte</Link>
              <Link href="?mie=1" className={`rounded-md px-3 py-1 ${sp.mie ? "bg-white shadow-sm" : "text-ink-500"}`}>Assegnate a me</Link>
            </div>
            <LinkButton href="/admin/richieste/nuova" variant="primary"><Sparkles className="size-4" /> Da email con AI</LinkButton>
            <LinkButton href="/admin/richieste/nuova?manuale=1"><Plus className="size-4" /> Manuale</LinkButton>
          </>
        }
      />
      <Kanban
        cards={list.map((i) => ({
          id: i.id,
          code: i.code,
          stage: i.stage,
          title: i.contactName,
          company: i.company,
          city: i.city,
          date: i.date ? day(i.date) : null,
          pax: i.pax,
          budget: i.budgetCents ? money0(i.budgetCents) : null,
          source: SOURCES[i.source] ?? i.source,
          assignee: i.assignee?.name ?? null,
          age: relative(i.createdAt),
          options: i._count.quoteOptions,
        }))}
      />
    </>
  );
}
