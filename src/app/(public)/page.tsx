import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, CreditCard, MessagesSquare, Sparkles, Store } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { SearchBar } from "@/components/search-bar";
import { RestaurantCard } from "@/components/restaurant-card";
import { Cover, LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { activeCities, minPrices } from "@/lib/queries";
import { n } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, cities, featured, stats] = await Promise.all([
    getUser(),
    activeCities(),
    db.organization.findMany({
      where: { kind: "RESTAURANT", status: "ACTIVE" },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    db.booking.aggregate({ _sum: { pax: true }, _count: true, where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
  ]);
  const prices = await minPrices(featured.map((r) => r.id));
  const showPrice = user?.role === "ORGANIZER" || user?.role === "ADMIN";

  return (
    <>
      <section className="relative overflow-hidden bg-ink-950 pb-20">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 60% at 80% 0%, rgb(245 154 7 / .35), transparent 60%), radial-gradient(50% 60% at 0% 100%, rgb(180 79 6 / .35), transparent 60%)",
          }}
        />
        <PublicHeader transparent />
        <div className="relative mx-auto max-w-7xl px-4 pt-32 sm:px-6 md:pt-40">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-200">
              <Sparkles className="size-3.5" /> Disponibilità in tempo reale · pagamento sicuro
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Il tavolo giusto per <span className="text-brand-400">ogni gruppo</span>, in tutta Italia.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-300">
              Ristoranti selezionati per tour operator, scuole, pellegrinaggi ed eventi aziendali. Menu dedicati, gratuità per i capogruppo,
              conferma rapida e un solo pagamento online.
            </p>
          </div>
          <div className="mt-10 max-w-5xl">
            <SearchBar cities={cities} />
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {cities.slice(0, 8).map((c) => (
              <Link
                key={c.slug}
                href={`/ristoranti?citta=${c.slug}`}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-ink-200 transition hover:border-brand-400 hover:text-white"
              >
                {c.name} <span className="text-ink-500">· {c.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
          {[
            [n(await db.organization.count({ where: { kind: "RESTAURANT", status: "ACTIVE" } })), "ristoranti selezionati"],
            [n(cities.length), "città"],
            [n(stats._count), "gruppi serviti"],
            [n(stats._sum.pax ?? 0), "coperti prenotati"],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-3xl font-semibold tracking-tight text-ink-950 tabular-nums">{v}</div>
              <div className="text-sm text-ink-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">In evidenza</h2>
            <p className="mt-1 text-sm text-ink-500">Locali amati dai nostri tour operator</p>
          </div>
          <Link href="/ristoranti" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            Vedi tutti <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((r) => (
            <RestaurantCard key={r.id} r={r} minPrice={prices.get(r.id)} showPrice={showPrice} />
          ))}
        </div>
      </section>

      <section id="come-funziona" className="bg-ink-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Come funziona per agenzie e organizzatori</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {[
              [CalendarCheck, "Cerca e verifica", "Filtra per città, data e numero di persone: vedi subito chi ha posto."],
              [BadgeCheck, "Prenota o chiedi un preventivo", "Scegli il menu dedicato ai gruppi oppure lasciaci la richiesta: rispondiamo in poche ore."],
              [CreditCard, "Paga in sicurezza", "Un solo pagamento online con carta o bonifico istantaneo, ricevuta immediata."],
              [MessagesSquare, "Tutto in un posto", "Voucher, messaggi con il ristorante, modifiche e storico nella tua area riservata."],
            ].map(([Icon, title, text], i) => {
              const I = Icon as typeof CalendarCheck;
              return (
                <div key={i} className="card p-5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <I className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{title as string}</h3>
                  <p className="mt-1 text-sm text-ink-500">{text as string}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/registrati" variant="dark" size="lg">
              Crea l&apos;account agenzia <ArrowRight className="size-4" />
            </LinkButton>
            <LinkButton href="/richiesta" variant="secondary" size="lg">
              Richiedi un preventivo
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-ink-950 p-8 text-white md:grid-cols-2 md:p-12">
          <div>
            <Store className="size-8 text-brand-400" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Hai un ristorante adatto ai gruppi?</h2>
            <p className="mt-3 text-ink-300">
              Ricevi prenotazioni da centinaia di agenzie italiane ed estere. Gestisci sale, menu e disponibilità da telefono e incassa direttamente
              sul tuo conto: la provvigione viene trattenuta in automatico, senza fatture da rincorrere.
            </p>
            <LinkButton href="/per-i-ristoratori" variant="primary" size="lg" className="mt-6">
              Scopri come entrare <ArrowRight className="size-4" />
            </LinkButton>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.slice(0, 4).map((r) => (
              <Cover key={r.id} name={r.name} src={r.coverImage} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
