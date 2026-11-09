import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { BookingWidget } from "@/components/booking-widget";

export default async function NuovaPrenotazione({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const restaurant = sp.ristorante
    ? await db.organization.findUnique({
        where: { id: sp.ristorante },
        include: { menus: { where: { active: true }, orderBy: { position: "asc" }, include: { services: true } } },
      })
    : null;

  if (!restaurant) {
    const list = await db.organization.findMany({
      where: { kind: "RESTAURANT", status: "ACTIVE", ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { city: { contains: sp.q, mode: "insensitive" } }] } : {}) },
      orderBy: { name: "asc" },
      take: 60,
    });
    return (
      <>
        <PageHeader title="Nuova prenotazione" subtitle="1. Scegli il ristorante" />
        <form className="relative mb-4 max-w-lg">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-ink-400" />
          {sp.inquiry && <input type="hidden" name="inquiry" value={sp.inquiry} />}
          <input name="q" defaultValue={sp.q} autoFocus placeholder="Cerca per nome o città…" className="input pl-9" />
        </form>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <Link key={r.id} href={`?ristorante=${r.id}${sp.inquiry ? `&inquiry=${sp.inquiry}` : ""}${sp.data ? `&data=${sp.data}` : ""}${sp.persone ? `&persone=${sp.persone}` : ""}`} className="card px-4 py-3 hover:border-brand-300">
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-ink-500">{r.city} · fino a {r.maxCapacity ?? "?"} pers.</div>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const inquiry = sp.inquiry ? await db.inquiry.findUnique({ where: { id: sp.inquiry } }) : null;
  const organizers = await db.organization.findMany({ where: { kind: "ORGANIZER", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="Nuova prenotazione" subtitle={`2. ${restaurant.name} · ${restaurant.city}${inquiry ? ` · dalla richiesta ${inquiry.code}` : ""}`} actions={<Link href="?" className="text-sm text-brand-700 hover:underline">Cambia ristorante</Link>} />
      <Card className="max-w-2xl">
        <CardHeader title="Dettagli" subtitle="Come staff puoi forzare anche servizi pieni o chiusi: il sistema lo segnala ma non blocca." />
        <div className="p-5">
          <BookingWidget
            restaurantId={restaurant.id}
            organizers={organizers}
            paymentNote="La modalità di pagamento segue le impostazioni del ristorante (modificabile dopo)."
            inquiryId={inquiry?.id}
            defaults={{
              date: sp.data ?? (inquiry?.date ? inquiry.date.toISOString().slice(0, 10) : undefined),
              pax: Number(sp.persone) || inquiry?.pax || undefined,
              organizerId: inquiry?.organizerId ?? undefined,
              groupType: inquiry?.groupType ?? undefined,
              contactName: inquiry?.contactName,
              contactPhone: inquiry?.phone ?? undefined,
            }}
            menus={restaurant.menus.map((m) => ({ id: m.id, name: m.name, priceCents: m.priceCents, minPax: m.minPax, maxPax: m.maxPax, freeEvery: m.freeEvery, serviceIds: m.services.map((s) => s.serviceId) }))}
          />
        </div>
      </Card>
    </>
  );
}
