import { db } from "./db";

export type CityInfo = { name: string; slug: string; count: number; image: string | null; hero: string | null };

/** Città con almeno un ristorante attivo (con le foto della città), ordinate per numero di locali */
export async function activeCities(): Promise<CityInfo[]> {
  const [rows, meta] = await Promise.all([
    db.organization.groupBy({
      by: ["citySlug"],
      where: { kind: "RESTAURANT", status: "ACTIVE", citySlug: { not: null } },
      _count: { _all: true },
      _min: { city: true },
      orderBy: { _count: { id: "desc" } },
    }),
    db.city.findMany(),
  ]);
  const bySlug = new Map(meta.map((c) => [c.slug, c]));
  return rows.map((r) => {
    const m = bySlug.get(r.citySlug!);
    return { slug: r.citySlug!, name: m?.name ?? r._min.city ?? r.citySlug!, count: r._count._all, image: m?.image ?? null, hero: m?.hero ?? null };
  });
}

/** Prezzo minimo dei menu attivi per ristorante */
export async function minPrices(ids: string[]) {
  const rows = await db.menu.groupBy({
    by: ["restaurantId"],
    where: { restaurantId: { in: ids }, active: true },
    _min: { priceCents: true },
  });
  return new Map(rows.map((r) => [r.restaurantId, r._min.priceCents ?? 0]));
}
