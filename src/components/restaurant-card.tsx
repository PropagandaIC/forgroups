import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { Cover } from "./ui";
import { money0 } from "@/lib/format";

export function RestaurantCard({
  r,
  minPrice,
  showPrice,
  availability,
}: {
  r: { slug: string; name: string; city: string | null; cuisine: string | null; coverImage: string | null; maxCapacity: number | null; tagline: string | null; tags: string | null; featured?: boolean };
  minPrice?: number;
  showPrice: boolean;
  availability?: { label: string; ok: boolean } | null;
}) {
  const chips = [...(r.tags?.split(",") ?? []), ...(r.cuisine?.split(",") ?? [])].map((t) => t.trim()).filter((t) => t && t.length < 22).slice(0, 3);
  return (
    <Link href={`/ristoranti/${r.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl">
        <Cover name={r.name} src={r.coverImage} className="aspect-[4/3] w-full transition duration-500 group-hover:scale-105" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/50 via-transparent to-transparent" />
        {availability ? (
          <span className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow ${availability.ok ? "bg-emerald-500 text-white" : "bg-white/90 text-ink-700"}`}>
            {availability.label}
          </span>
        ) : r.featured ? (
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink-900 shadow">★ Scelto da noi</span>
        ) : null}
        {r.maxCapacity ? (
          <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <Users className="size-3" /> fino a {r.maxCapacity}
          </span>
        ) : null}
      </div>
      <div className="px-1 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-ink-950 group-hover:text-brand-700">{r.name}</h3>
          {minPrice ? (
            <div className="shrink-0 text-right text-xs text-ink-500">
              {showPrice ? (
                <>da <span className="text-sm font-semibold text-ink-900">{money0(minPrice)}</span></>
              ) : (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">Prezzi riservati</span>
              )}
            </div>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-500"><MapPin className="size-3" />{r.city}</div>
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((t) => <span key={t} className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">{t}</span>)}
          </div>
        )}
      </div>
    </Link>
  );
}
