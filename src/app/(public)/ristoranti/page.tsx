import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { PublicHeader } from "@/components/public-header";
import { SearchBar } from "@/components/search-bar";
import { RestaurantCard } from "@/components/restaurant-card";
import { Empty, LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { activeCities, minPrices } from "@/lib/queries";
import { availabilityFor } from "@/lib/availability";
import { parseDay, dayLong } from "@/lib/format";

export const metadata: Metadata = { title: "Ristoranti per gruppi" };
export const dynamic = "force-dynamic";

const PAGE = 24;

export default async function Ristoranti({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [user, cities] = await Promise.all([getUser(), activeCities()]);
  const date = parseDay(sp.data);
  const pax = Number(sp.persone) || 0;
  const page = Math.max(1, Number(sp.pagina) || 1);

  const where: Prisma.OrganizationWhereInput = { kind: "RESTAURANT", status: "ACTIVE" };
  if (sp.citta) where.citySlug = sp.citta;
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { cuisine: { contains: sp.q, mode: "insensitive" } }];
  if (pax) where.maxCapacity = { gte: pax };
  if (sp.servizio) where.services = { some: { kind: sp.servizio, active: true } };

  const [total, list] = await Promise.all([
    db.organization.count({ where }),
    db.organization.findMany({ where, orderBy: [{ featured: "desc" }, { name: "asc" }], skip: (page - 1) * PAGE, take: PAGE }),
  ]);
  const prices = await minPrices(list.map((r) => r.id));
  const showPrice = user?.role === "ORGANIZER" || user?.role === "ADMIN";

  // Disponibilità reale per la data scelta
  const avail = new Map<string, { label: string; ok: boolean }>();
  if (date) {
    await Promise.all(
      list.map(async (r) => {
        const slots = (await availabilityFor(r.id, date)).filter((s) => !sp.servizio || s.kind === sp.servizio);
        const ok = slots.filter((s) => s.open && s.free >= Math.max(pax, 1));
        avail.set(r.id, ok.length ? { ok: true, label: `Disponibile · ${[...new Set(ok.map((s) => s.kind))].join(", ")}` } : { ok: false, label: "Non disponibile" });
      }),
    );
    list.sort((a, b) => Number(avail.get(b.id)?.ok) - Number(avail.get(a.id)?.ok));
  }

  const cityName = cities.find((c) => c.slug === sp.citta)?.name;
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    u.set("pagina", String(p));
    return `?${u}`;
  };

  return (
    <>
      <PublicHeader />
      <div className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <SearchBar cities={cities} defaults={sp} compact />
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Ristoranti per gruppi{cityName ? ` a ${cityName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {total} locali{date ? ` · disponibilità per ${dayLong(date)}` : ""}
              {pax ? ` · ${pax} persone` : ""}
            </p>
          </div>
          {!showPrice && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-800">
              Sei un&apos;agenzia? <a href="/accedi" className="font-semibold underline">Accedi</a> per vedere i prezzi riservati e prenotare.
            </div>
          )}
        </div>
        {list.length === 0 ? (
          <div className="card">
            <Empty icon={<SlidersHorizontal className="size-5" />} title="Nessun ristorante corrisponde ai filtri">
              Prova a togliere qualche filtro, oppure lasciaci una richiesta: troviamo noi la soluzione per il tuo gruppo.
              <div className="mt-4">
                <LinkButton href="/richiesta" variant="primary">Richiedi un preventivo</LinkButton>
              </div>
            </Empty>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((r) => (
              <RestaurantCard key={r.id} r={r} minPrice={prices.get(r.id)} showPrice={showPrice} availability={date ? avail.get(r.id) : null} />
            ))}
          </div>
        )}
        {total > PAGE && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm">
            {page > 1 && <LinkButton href={qs(page - 1)} size="sm">← Precedenti</LinkButton>}
            <span className="px-3 text-ink-500">Pagina {page} di {Math.ceil(total / PAGE)}</span>
            {page * PAGE < total && <LinkButton href={qs(page + 1)} size="sm">Successivi →</LinkButton>}
          </div>
        )}
      </main>
    </>
  );
}
