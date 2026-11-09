import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, CreditCard, MessagesSquare, ShieldCheck, Sparkles, Star, Store } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { SearchBar } from "@/components/search-bar";
import { RestaurantCard } from "@/components/restaurant-card";
import { CityTiles } from "@/components/city-tiles";
import { Cover, LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { activeCities, minPrices } from "@/lib/queries";
import { n } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, cities, featured, stats, total] = await Promise.all([
    getUser(),
    activeCities(),
    db.organization.findMany({
      where: { kind: "RESTAURANT", status: "ACTIVE", coverImage: { not: null } },
      orderBy: [{ featured: "desc" }, { maxCapacity: "desc" }],
      take: 8,
    }),
    db.booking.aggregate({ _sum: { pax: true }, _count: true, where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
    db.organization.count({ where: { kind: "RESTAURANT", status: "ACTIVE" } }),
  ]);
  const prices = await minPrices(featured.map((r) => r.id));
  const showPrice = user?.role === "ORGANIZER" || user?.role === "ADMIN";
  const hero = cities[0]?.hero ?? featured[0]?.coverImage;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink-950">
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" referrerPolicy="no-referrer" className="absolute inset-0 -z-10 size-full scale-105 object-cover opacity-60" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/80 via-ink-950/55 to-ink-950" />
        <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(60% 50% at 85% 10%, rgb(245 154 7 / .25), transparent 60%)" }} />
        <PublicHeader transparent />
        <div className="mx-auto max-w-7xl px-4 pt-32 pb-16 sm:px-6 md:pt-44 md:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-brand-200 backdrop-blur">
              <Sparkles className="size-3.5" /> {total} ristoranti selezionati · disponibilità in tempo reale
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Il tavolo giusto per <span className="text-brand-400">ogni gruppo</span>, in tutta Italia.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-200">
              Ristoranti per tour operator, scuole, pellegrinaggi ed eventi aziendali. Menu dedicati, gratuità per i capogruppo, conferma rapida e un solo pagamento online.
            </p>
          </div>
          <div className="mt-10 max-w-5xl"><SearchBar cities={cities} /></div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-300">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand-400" /> Pagamento sicuro con Stripe</span>
            <span className="inline-flex items-center gap-1.5"><BadgeCheck className="size-4 text-brand-400" /> Locali verificati dal nostro team</span>
            <span className="inline-flex items-center gap-1.5"><Star className="size-4 text-brand-400" /> Assistenza in italiano, inglese e spagnolo</span>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
          {[
            [n(total), "ristoranti per gruppi"],
            [n(cities.length), "città italiane"],
            [n(stats._count), "gruppi serviti"],
            [n(stats._sum.pax ?? 0), "coperti prenotati"],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-3xl font-semibold tracking-tight text-ink-950">{v}</div>
              <div className="text-sm text-ink-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Dove porti il tuo gruppo?</h2>
            <p className="mt-1 text-sm text-ink-500">Dalle grandi città d&apos;arte ai borghi più belli</p>
          </div>
          <Link href="/ristoranti" className="hidden items-center gap-1 text-sm font-medium text-brand-700 hover:underline sm:inline-flex">Tutte le città <ArrowRight className="size-4" /></Link>
        </div>
        <CityTiles cities={cities} />
        <div className="mt-4 flex flex-wrap gap-2">
          {cities.slice(7, 30).map((c) => (
            <Link key={c.slug} href={`/ristoranti?citta=${c.slug}`} className="rounded-full border border-ink-200 px-3 py-1 text-sm text-ink-600 transition hover:border-brand-400 hover:text-ink-900">
              {c.name} <span className="text-ink-400">· {c.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">I preferiti dai tour operator</h2>
              <p className="mt-1 text-sm text-ink-500">Locali che accolgono gruppi ogni giorno, con menu dedicati</p>
            </div>
            <Link href="/ristoranti" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">Vedi tutti <ArrowRight className="size-4" /></Link>
          </div>
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((r) => <RestaurantCard key={r.id} r={r} minPrice={prices.get(r.id)} showPrice={showPrice} />)}
          </div>
        </div>
      </section>

      <section id="come-funziona" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Come funziona per agenzie e organizzatori</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-4">
          {[
            [CalendarCheck, "1. Cerca e verifica", "Filtra per città, data e numero di persone: vedi subito chi ha posto."],
            [BadgeCheck, "2. Prenota o chiedi", "Scegli il menu per gruppi o lasciaci la richiesta: rispondiamo in poche ore."],
            [CreditCard, "3. Paga in sicurezza", "Un solo pagamento online dopo la conferma, con ricevuta immediata."],
            [MessagesSquare, "4. Tutto in un posto", "Voucher, messaggi con il ristorante, modifiche e storico nella tua area."],
          ].map(([Icon, title, text], i) => {
            const I = Icon as typeof CalendarCheck;
            return (
              <div key={i} className="card p-5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><I className="size-5" /></div>
                <h3 className="mt-4 font-semibold">{title as string}</h3>
                <p className="mt-1 text-sm text-ink-500">{text as string}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/registrati" variant="dark" size="lg">Crea l&apos;account agenzia <ArrowRight className="size-4" /></LinkButton>
          <LinkButton href="/richiesta" variant="secondary" size="lg">Richiedi un preventivo</LinkButton>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-ink-950 p-8 text-white md:grid-cols-2 md:p-12">
          <div>
            <Store className="size-8 text-brand-400" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Hai un ristorante adatto ai gruppi?</h2>
            <p className="mt-3 text-ink-300">
              Ricevi prenotazioni da agenzie italiane ed estere. Gestisci sale, menu e disponibilità dal telefono e incassa direttamente sul tuo conto:
              la provvigione viene trattenuta in automatico, senza fatture da rincorrere.
            </p>
            <LinkButton href="/per-i-ristoratori" variant="primary" size="lg" className="mt-6">Scopri come entrare <ArrowRight className="size-4" /></LinkButton>
          </div>
          <div className="grid grid-cols-3 grid-rows-2 gap-3">
            {featured.slice(0, 5).map((r, i) => (
              <Cover key={r.id} name={r.name} src={r.coverImage} className={`rounded-2xl ${i === 0 ? "col-span-2 row-span-2 h-full" : "aspect-square"}`} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
