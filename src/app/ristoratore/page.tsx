import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardHeader, Stat } from "@/components/ui";
import { BookingRows } from "@/components/booking-rows";
import { StatusButton } from "@/components/booking-client";
import { addDays, day, money, money0, n, todayUTC } from "@/lib/format";

export default async function RistoratoreHome() {
  const user = await requireUser(["RESTAURANT"]);
  const rid = user.organizationId ?? "-";
  const today = todayUTC();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const [org, toConfirm, upcoming, month] = await Promise.all([
    db.organization.findUnique({ where: { id: rid } }),
    db.booking.findMany({ where: { restaurantId: rid, status: "REQUESTED" }, orderBy: { date: "asc" }, include: { restaurant: true, organizer: true, menu: true } }),
    db.booking.findMany({ where: { restaurantId: rid, status: "CONFIRMED", date: { gte: today, lt: addDays(today, 7) } }, orderBy: [{ date: "asc" }, { time: "asc" }], include: { restaurant: true, organizer: true } }),
    db.booking.aggregate({ where: { restaurantId: rid, status: { in: ["CONFIRMED", "COMPLETED"] }, date: { gte: monthStart, lt: addDays(monthStart, 32) } }, _sum: { pax: true, totalCents: true, commissionCents: true }, _count: true }),
  ]);
  const todayList = upcoming.filter((b) => b.date.getTime() === today.getTime());
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{org?.name}</h1>
        <p className="mt-1 text-sm text-ink-500">Oggi {todayList.length ? `${todayList.length} gruppi · ${n(todayList.reduce((s, b) => s + b.pax, 0))} coperti` : "nessun gruppo"}</p>
      </div>
      {org && !org.stripeTransfersActive && (
        <Link href="/ristoratore/locale?tab=pagamenti" className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="size-5 shrink-0" />
          <span className="flex-1"><b>Attiva gli incassi online:</b> i gruppi pagano in anticipo e ricevi i soldi direttamente sul tuo conto, già al netto della provvigione.</span>
          <ArrowRight className="size-4" />
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Gruppi questo mese" value={n(month._count)} accent />
        <Stat label="Coperti" value={n(month._sum.pax)} />
        <Stat label="Incasso netto previsto" value={money0((month._sum.totalCents ?? 0) - (month._sum.commissionCents ?? 0))} />
      </div>
      <Card className="mt-6">
        <CardHeader title="Da confermare" subtitle="Rispondi presto: le agenzie scelgono chi conferma prima" />
        {toConfirm.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Nessuna richiesta in attesa. 👌</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {toConfirm.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <Link href={`/ristoratore/prenotazioni/${b.code}`} className="min-w-0 sm:flex-1">
                  <div className="font-medium">{day(b.date)} ore {b.time} · {b.pax} persone</div>
                  <div className="text-sm text-ink-500">{b.organizer?.name ?? b.contactName} · {b.menu?.name} · {money(b.totalCents)}{b.dietaryNotes ? ` · ⚠ ${b.dietaryNotes}` : ""}</div>
                </Link>
                <div className="flex shrink-0 gap-2">
                  <StatusButton bookingId={b.id} to="CONFIRMED" label="Conferma" variant="primary" />
                  <StatusButton bookingId={b.id} to="DECLINED" label="Rifiuta" variant="danger" askReason="Motivo (es. sala già occupata):" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="mt-6">
        <CardHeader title="Prossimi 7 giorni" />
        <BookingRows rows={upcoming} basePath="/ristoratore/prenotazioni" show="client" empty="Nessun gruppo confermato nei prossimi giorni" />
      </Card>
    </>
  );
}
