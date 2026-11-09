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
  r: { slug: string; name: string; city: string | null; cuisine: string | null; coverImage: string | null; maxCapacity: number | null; tagline: string | null; tags: string | null };
  minPrice?: number;
  showPrice: boolean;
  availability?: { label: string; ok: boolean } | null;
}) {
  return (
    <Link href={`/ristoranti/${r.slug}`} className="group block overflow-hidden rounded-2xl border border-ink-200/70 bg-white transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]">
      <div className="relative">
        <Cover name={r.name} src={r.coverImage} className="aspect-[4/3] w-full" />
        {availability && (
          <span
            className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow ${availability.ok ? "bg-emerald-500 text-white" : "bg-white/90 text-ink-700"}`}
          >
            {availability.label}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-ink-950 group-hover:text-brand-700">{r.name}</h3>
          {minPrice ? (
            <div className="shrink-0 text-right text-xs text-ink-500">
              {showPrice ? (
                <>
                  da <span className="text-sm font-semibold text-ink-900">{money0(minPrice)}</span>
                </>
              ) : (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">Prezzi riservati</span>
              )}
            </div>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{r.city}</span>
          {r.maxCapacity ? <span className="inline-flex items-center gap-1"><Users className="size-3" />fino a {r.maxCapacity}</span> : null}
        </div>
        {r.cuisine && <p className="mt-2 line-clamp-1 text-sm text-ink-600">{r.cuisine}</p>}
        {r.tags && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.tags.split(",").slice(0, 3).map((t) => (
              <span key={t} className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">{t.trim()}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
