"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

/** Galleria a mosaico con visualizzazione a schermo intero (frecce, swipe, Esc). */
export function Gallery({ name, images, cover }: { name: string; images: string[]; cover: string | null }) {
  // le foto in alta risoluzione hanno la precedenza; la copertina serve solo se mancano
  const all = images.length ? [...new Set(images)] : cover ? [cover] : [];
  const [open, setOpen] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + all.length) % all.length)), [all.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, go]);

  if (!all.length) return null;
  const tiles = all.slice(0, 5);
  const img = (src: string, i: number, cls: string) => (
    <button key={src} onClick={() => setOpen(i)} className={`group relative overflow-hidden bg-ink-200 ${cls}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`${name} – foto ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} referrerPolicy="no-referrer" className="size-full object-cover transition duration-500 group-hover:scale-105" />
      {i === tiles.length - 1 && all.length > tiles.length && (
        <span className="absolute inset-0 flex items-center justify-center bg-ink-950/50 text-lg font-semibold text-white">+{all.length - tiles.length} foto</span>
      )}
    </button>
  );

  return (
    <>
      <div className="relative grid h-[300px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl sm:h-[440px]">
        {img(tiles[0]!, 0, tiles.length === 1 ? "col-span-4 row-span-2" : "col-span-4 row-span-2 md:col-span-2")}
        {tiles.slice(1).map((src, k) => img(src, k + 1, `hidden md:block ${tiles.length === 2 ? "col-span-2 row-span-2" : tiles.length === 3 ? "col-span-2" : ""}`))}
        <button onClick={() => setOpen(0)} className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-medium text-ink-900 shadow">
          <Images className="size-4" /> {all.length} foto
        </button>
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink-950/95"
          onTouchStart={(e) => setTouchX(e.touches[0]!.clientX)}
          onTouchEnd={(e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0]!.clientX - touchX;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            setTouchX(null);
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
            <span>{name} · {open + 1} / {all.length}</span>
            <button onClick={() => setOpen(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Chiudi"><X className="size-5" /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={all[open]} alt={`${name} – foto ${open + 1}`} referrerPolicy="no-referrer" className="max-h-full max-w-full rounded-lg object-contain" />
            <button onClick={() => go(-1)} className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Precedente"><ChevronLeft className="size-6" /></button>
            <button onClick={() => go(1)} className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Successiva"><ChevronRight className="size-6" /></button>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-4">
            {all.map((src, i) => (
              <button key={src} onClick={() => setOpen(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-md ring-2 ${i === open ? "ring-brand-400" : "ring-transparent opacity-60 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
