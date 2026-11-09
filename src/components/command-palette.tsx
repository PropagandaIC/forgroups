"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Inbox, Loader2, Search, Sparkles, Store, Ticket, Users } from "lucide-react";
import { searchAll, type SearchHit } from "@/app/actions/search";

const ICONS = { booking: Ticket, restaurant: Store, organizer: Users, inquiry: Inbox };
const QUICK = [
  { title: "Nuova richiesta da email (AI)", href: "/admin/richieste/nuova", icon: Sparkles },
  { title: "Nuova prenotazione", href: "/admin/prenotazioni/nuova", icon: CalendarPlus },
  { title: "Prenotazioni da confermare", href: "/admin/prenotazioni?vista=da-confermare", icon: Ticket },
  { title: "Pipeline richieste", href: "/admin/richieste", icon: Inbox },
];

export function CommandPalette() {
  const [open, setOpenRaw] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const setOpen = (v: boolean | ((o: boolean) => boolean)) =>
    setOpenRaw((o) => {
      const next = typeof v === "function" ? v(o) : v;
      if (!next) {
        setQ("");
        setHits([]);
      }
      return next;
    });
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("fg:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("fg:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length < 2) return setHits([]);
      start(async () => {
        setHits(await searchAll(q));
        setActive(0);
      });
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const items = q.trim().length < 2 ? QUICK.map((x) => ({ title: x.title, subtitle: "", href: x.href, Icon: x.icon })) : hits.map((h) => ({ ...h, Icon: ICONS[h.type] }));

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;
  // il contenuto si azzera a ogni apertura grazie alla key sul pannello
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div key="palette" className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-ink-100 px-4">
          {pending ? <Loader2 className="size-4 animate-spin text-ink-400" /> : <Search className="size-4 text-ink-400" />}
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, items.length - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
              if (e.key === "Enter" && items[active]) go(items[active].href);
            }}
            placeholder="Cerca prenotazione, ristorante, agenzia, richiesta…"
            className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
          />
          <span className="kbd">esc</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {q.trim().length < 2 && <div className="px-3 pt-1 pb-2 text-[11px] font-medium tracking-wide text-ink-400 uppercase">Azioni rapide</div>}
          {items.length === 0 && q.trim().length >= 2 && !pending && <div className="px-3 py-6 text-center text-sm text-ink-500">Nessun risultato per “{q}”</div>}
          {items.map((it, i) => (
            <button
              key={it.href + i}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(it.href)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === active ? "bg-brand-50" : ""}`}
            >
              <it.Icon className="size-4 shrink-0 text-ink-500" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink-900">{it.title}</span>
                {it.subtitle && <span className="block truncate text-xs text-ink-500">{it.subtitle}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PaletteTrigger({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("fg:palette"))}
      className={`flex h-9 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-500 shadow-sm transition hover:border-ink-300 ${className ?? ""}`}
    >
      <Search className="size-4" />
      <span className="flex-1 text-left">Cerca…</span>
      <span className="kbd">⌘K</span>
    </button>
  );
}
