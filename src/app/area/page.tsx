import Link from "next/link";
import { ArrowRight, CreditCard, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardHeader, LinkButton, Stat } from "@/components/ui";
import { BookingRows } from "@/components/booking-rows";
import { SearchBar } from "@/components/search-bar";
import { activeCities } from "@/lib/queries";
import { money, money0, n, todayUTC } from "@/lib/format";

export default async function AreaHome() {
  const user = await requireUser(["ORGANIZER"]);
  const orgId = user.organizationId ?? "-";
  const today = todayUTC();
  const [cities, upcoming, toPay, year] = await Promise.all([
    activeCities(),
    db.booking.findMany({ where: { organizerId: orgId, date: { gte: today }, status: { in: ["REQUESTED", "CONFIRMED"] } }, orderBy: [{ date: "asc" }, { time: "asc" }], take: 8, include: { restaurant: true } }),
    db.booking.findMany({ where: { organizerId: orgId, status: "CONFIRMED", paymentStatus: { in: ["UNPAID", "PARTIAL"] }, paymentMode: { in: ["ONLINE_FULL", "ONLINE_DEPOSIT"] } }, orderBy: { date: "asc" }, include: { restaurant: true } }),
    db.booking.aggregate({ where: { organizerId: orgId, status: { in: ["CONFIRMED", "COMPLETED"] }, date: { gte: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)) } }, _sum: { pax: true, totalCents: true }, _count: true }),
  ]);
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Ciao {user.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-sm text-ink-500">{user.organization?.name} · trova il ristorante giusto per il tuo prossimo gruppo</p>
      </div>
      <div className="mb-6"><SearchBar cities={cities} compact /></div>

      {toPay.length > 0 && (
        <div className="mb-6 rounded-2xl bg-ink-950 p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-300"><CreditCard className="size-4" /> {toPay.length} prenotazioni confermate in attesa di pagamento</div>
          <ul className="mt-3 divide-y divide-white/10">
            {toPay.map((b) => (
              <li key={b.id}>
                <Link href={`/area/prenotazioni/${b.code}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-brand-200">
                  <span>{b.restaurant.name} · {b.date.toISOString().slice(0, 10)} · {b.pax} pers.</span>
                  <span className="flex items-center gap-2 font-semibold">{money(b.totalCents - b.paidCents)} <ArrowRight className="size-4" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Gruppi ${today.getUTCFullYear()}`} value={n(year._count)} />
        <Stat label="Coperti prenotati" value={n(year._sum.pax)} />
        <Stat label="Valore prenotato" value={money0(year._sum.totalCents)} />
      </div>
      <Card className="mt-6">
        <CardHeader title="Prossimi servizi" action={<Link href="/area/prenotazioni" className="text-xs font-medium text-brand-700 hover:underline">Tutte →</Link>} />
        <BookingRows rows={upcoming} basePath="/area/prenotazioni" empty="Nessun gruppo in programma" />
      </Card>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/ristoranti" className="card flex items-center gap-4 p-5 hover:border-brand-300">
          <Search className="size-6 text-brand-600" />
          <div><div className="font-semibold">Cerca e prenota</div><div className="text-sm text-ink-500">Disponibilità in tempo reale e prezzi riservati</div></div>
        </Link>
        <Link href="/area/richieste" className="card flex items-center gap-4 p-5 hover:border-brand-300">
          <ArrowRight className="size-6 text-brand-600" />
          <div><div className="font-semibold">Chiedi un preventivo</div><div className="text-sm text-ink-500">Ci pensiamo noi: proposte in poche ore</div></div>
        </Link>
      </div>
      <p className="mt-8 text-center text-xs text-ink-500">Serve aiuto? Scrivici dalla pagina della prenotazione o chiama +39 06 88 805 384. <LinkButton href="/ristoranti" variant="ghost" size="sm">Vai al catalogo</LinkButton></p>
    </>
  );
}
