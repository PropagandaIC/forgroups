import { db } from "./db";

/** Città con almeno un ristorante attivo, ordinate per numero di locali */
export async function activeCities() {
  const rows = await db.organization.groupBy({
    by: ["city", "citySlug"],
    where: { kind: "RESTAURANT", status: "ACTIVE", citySlug: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
  });
  return rows.map((r) => ({ name: r.city ?? "", slug: r.citySlug ?? "", count: r._count._all }));
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
