import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Clock, Gift, Lock, MapPin, Users, UtensilsCrossed } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { BookingWidget } from "@/components/booking-widget";
import { InquiryForm } from "@/components/inquiry-form";
import { Cover, LinkButton } from "@/components/ui";
import { Gallery } from "@/components/gallery";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { PAYMENT_MODE } from "@/lib/labels";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.organization.findFirst({
    where: { slug, kind: "RESTAURANT", status: "ACTIVE" },
    include: {
      rooms: { orderBy: { capacity: "desc" } },
      services: { where: { active: true }, orderBy: { startTime: "asc" } },
      menus: { where: { active: true }, orderBy: [{ position: "asc" }, { priceCents: "asc" }], include: { services: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await load((await params).slug);
  return r ? { title: `${r.name} – ristorante per gruppi a ${r.city}`, description: r.tagline ?? r.description?.slice(0, 160) } : {};
}

type Course = { course: string; items: string[] };

export default async function RestaurantPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ slug }, sp, user] = await Promise.all([params, searchParams, getUser()]);
  const r = await load(slug);
  if (!r) notFound();
  const canBook = user?.role === "ORGANIZER" && user.status === "ACTIVE";
  const showPrice = canBook || user?.role === "ADMIN";
  const images: string[] = r.images ? JSON.parse(r.images) : [];
  const kinds = [...new Set(r.services.map((s) => s.kind))];
  const online = r.acceptsOnlinePayment && r.stripeTransfersActive;
  const paymentNote = online
    ? r.defaultPaymentMode === "ONLINE_DEPOSIT"
      ? `Dopo la conferma: acconto online del ${r.defaultDepositPercent}%, saldo sul posto.`
      : "Dopo la conferma: pagamento online sicuro (carta, Apple Pay, bonifico istantaneo)."
    : `Pagamento: ${PAYMENT_MODE.ON_SITE.toLowerCase()}.`;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link href="/ristoranti" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
          <ChevronLeft className="size-4" /> Tutti i ristoranti
        </Link>

        <div className="mt-4">
          {images.length || r.coverImage ? (
            <Gallery name={r.name} images={images} cover={r.coverImage} />
          ) : (
            <Cover name={r.name} className="h-[300px] rounded-3xl sm:h-[440px]" />
          )}
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">{r.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{r.address}, {r.city}</span>
              {r.maxCapacity && <span className="inline-flex items-center gap-1"><Users className="size-4" />fino a {r.maxCapacity} persone</span>}
              {r.cuisine && <span className="inline-flex items-center gap-1"><UtensilsCrossed className="size-4" />{r.cuisine}</span>}
            </div>
            {r.tags && (
              <div className="mt-4 flex flex-wrap gap-2">
                {r.tags.split(",").map((t) => (
                  <span key={t} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">{t.trim()}</span>
                ))}
              </div>
            )}
            {r.tagline && <p className="mt-6 text-lg text-ink-700">{r.tagline}</p>}
            {r.description && (
              <div className="mt-4 space-y-3 whitespace-pre-line text-ink-600">
                {r.tagline && r.description.startsWith(r.tagline) ? r.description.slice(r.tagline.length).trim() : r.description}
              </div>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="card p-4">
                <Clock className="size-5 text-brand-600" />
                <div className="mt-2 text-sm font-medium">Servizi</div>
                <div className="text-sm text-ink-500">{kinds.join(" · ") || "—"}</div>
              </div>
              <div className="card p-4">
                <Users className="size-5 text-brand-600" />
                <div className="mt-2 text-sm font-medium">Sale</div>
                <div className="text-sm text-ink-500">{r.rooms.map((x) => `${x.name} (${x.capacity})`).join(" · ") || "—"}</div>
              </div>
              <div className="card p-4">
                <Clock className="size-5 text-brand-600" />
                <div className="mt-2 text-sm font-medium">Orari</div>
                <div className="text-sm text-ink-500">{r.openingHours ?? "—"}</div>
              </div>
            </div>

            <h2 className="mt-12 text-xl font-semibold tracking-tight">Menu per gruppi</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {r.menus.map((m) => {
                const courses: Course[] = m.courses ? JSON.parse(m.courses) : [];
                return (
                  <div key={m.id} className="card flex flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{m.name}</h3>
                        <p className="text-xs text-ink-500">
                          {m.minPax}–{m.maxPax} persone{m.audience ? ` · ${m.audience}` : ""}
                        </p>
                      </div>
                      {showPrice ? (
                        <div className="text-right">
                          <div className="text-lg font-semibold tabular-nums">{money(m.priceCents)}</div>
                          <div className="text-xs text-ink-500">a persona</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-600">
                          <Lock className="size-3" /> Prezzo riservato
                        </span>
                      )}
                    </div>
                    {m.description && <p className="mt-2 text-sm text-ink-600">{m.description}</p>}
                    <dl className="mt-3 space-y-2 text-sm">
                      {courses.map((c) => (
                        <div key={c.course}>
                          <dt className="text-xs font-semibold tracking-wide text-ink-400 uppercase">{c.course}</dt>
                          <dd className="text-ink-700">{c.items.join(" · ")}</dd>
                        </div>
                      ))}
                    </dl>
                    {m.freeEvery && (
                      <div className="mt-auto pt-4 text-xs font-medium text-emerald-700">
                        <Gift className="mr-1 inline size-3.5" /> 1 gratuità ogni {m.freeEvery} paganti
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="card p-5">
              {canBook ? (
                <>
                  <h2 className="mb-4 text-lg font-semibold">Prenota per il tuo gruppo</h2>
                  <BookingWidget
                    restaurantId={r.id}
                    paymentNote={paymentNote}
                    defaults={{ date: sp.data, pax: Number(sp.persone) || undefined, contactName: user!.name, contactPhone: user!.phone ?? undefined }}
                    menus={r.menus.map((m) => ({
                      id: m.id,
                      name: m.name,
                      priceCents: m.priceCents,
                      minPax: m.minPax,
                      maxPax: m.maxPax,
                      freeEvery: m.freeEvery,
                      serviceIds: m.services.map((s) => s.serviceId),
                    }))}
                  />
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">Prenota o chiedi un preventivo</h2>
                  {!user && (
                    <div className="mt-3 rounded-xl bg-ink-950 p-4 text-sm text-ink-200">
                      <p>
                        Le agenzie registrate vedono prezzi riservati, disponibilità in tempo reale e prenotano in un minuto.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <LinkButton href={`/accedi?next=/ristoranti/${r.slug}`} variant="primary" size="sm">Accedi</LinkButton>
                        <LinkButton href="/registrati" variant="ghost" size="sm" className="border border-white/25 text-white hover:bg-white/10">Registrati</LinkButton>
                      </div>
                    </div>
                  )}
                  <p className="mt-5 mb-3 text-sm text-ink-500">Oppure scrivici: ti rispondiamo in poche ore.</p>
                  <InquiryForm restaurantId={r.id} compact defaults={{ contactName: user?.name, email: user?.email }} />
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
