"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import type { InquiryStage } from "@prisma/client";
import { CalendarDays, Users } from "lucide-react";
import { setStageAction } from "@/app/actions/inquiry";

export type KanbanCard = {
  id: string;
  code: string;
  stage: InquiryStage;
  title: string;
  company: string | null;
  city: string | null;
  date: string | null;
  pax: number | null;
  budget: string | null;
  source: string;
  assignee: string | null;
  age: string;
  options: number;
};

const COLS: { stage: InquiryStage; label: string; dot: string }[] = [
  { stage: "NEW", label: "Nuove", dot: "bg-violet-500" },
  { stage: "QUALIFIED", label: "In lavorazione", dot: "bg-amber-500" },
  { stage: "QUOTED", label: "Preventivo inviato", dot: "bg-sky-500" },
  { stage: "WON", label: "Confermate", dot: "bg-emerald-500" },
  { stage: "LOST", label: "Perse", dot: "bg-ink-400" },
];

export function Kanban({ cards }: { cards: KanbanCard[] }) {
  const [items, move] = useOptimistic(cards, (state, { id, stage }: { id: string; stage: InquiryStage }) =>
    state.map((c) => (c.id === id ? { ...c, stage } : c)),
  );
  const [, start] = useTransition();

  const drop = (stage: InquiryStage, id: string) => {
    const card = items.find((c) => c.id === id);
    if (!card || card.stage === stage) return;
    const reason = stage === "LOST" ? window.prompt("Perché è persa? (prezzo, data, annullata…)") ?? undefined : undefined;
    if (stage === "LOST" && reason === undefined) return;
    start(async () => {
      move({ id, stage });
      await setStageAction(id, stage, reason);
    });
  };

  return (
    <div className="thin-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {COLS.map((col) => {
        const list = items.filter((c) => c.stage === col.stage);
        return (
          <div
            key={col.stage}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(col.stage, e.dataTransfer.getData("text/plain"))}
            className="flex w-72 shrink-0 flex-col rounded-2xl bg-ink-100/70 p-2"
          >
            <div className="flex items-center gap-2 px-2 py-2 text-sm font-semibold">
              <span className={`size-2 rounded-full ${col.dot}`} />
              {col.label}
              <span className="ml-auto rounded-full bg-white px-2 text-xs font-medium text-ink-500">{list.length}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2">
              {list.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/richieste/${c.code}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                  className="block cursor-grab rounded-xl border border-ink-200/70 bg-white p-3 shadow-sm transition hover:border-brand-300 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.title}</div>
                      {c.company && <div className="truncate text-xs text-ink-500">{c.company}</div>}
                    </div>
                    {c.assignee && (
                      <span title={c.assignee} className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">
                        {c.assignee.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-600">
                    {c.city && <span>{c.city}</span>}
                    {c.date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" />{c.date}</span>}
                    {c.pax && <span className="inline-flex items-center gap-1"><Users className="size-3" />{c.pax}</span>}
                    {c.budget && <span>{c.budget} p.p.</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                    <span>{c.code} · {c.source}</span>
                    <span>{c.options ? `${c.options} proposte · ` : ""}{c.age}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
