import Link from "next/link";
import type { CityInfo } from "@/lib/queries";

/** Tessere fotografiche delle città: la prima grande, le altre in griglia */
export function CityTiles({ cities }: { cities: CityInfo[] }) {
  const [first, ...rest] = cities;
  if (!first) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2">
      <Tile c={first} big />
      {rest.slice(0, 6).map((c) => <Tile key={c.slug} c={c} />)}
    </div>
  );
}

function Tile({ c, big }: { c: CityInfo; big?: boolean }) {
  return (
    <Link
      href={`/ristoranti?citta=${c.slug}`}
      className={`group relative block overflow-hidden rounded-2xl bg-ink-200 ${big ? "aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto" : "aspect-[4/3]"}`}
    >
      {c.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.image} alt={`Ristoranti per gruppi a ${c.name}`} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className={`font-semibold tracking-tight text-white ${big ? "text-3xl" : "text-lg"}`}>{c.name}</div>
        <div className="text-sm text-white/80">{c.count} {c.count === 1 ? "ristorante" : "ristoranti"}</div>
      </div>
    </Link>
  );
}
