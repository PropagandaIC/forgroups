import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { addDays, dayLong, isoDay, n, parseDay, todayUTC } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/labels";

export default async function Agenda({ searchParams }: { searchParams: Promise<{ dal?: string; citta?: string }> }) {
  const sp = await searchParams;
  const from = parseDay(sp.dal) ?? todayUTC();
  const to = addDays(from, 14);
  const bookings = await db.booking.findMany({
    where: { date: { gte: from, lt: to }, status: { in: ["REQUESTED", "CONFIRMED", "COMPLETED"] }, ...(sp.citta ? { restaurant: { citySlug: sp.citta } } : {}) },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: { restaurant: true, organizer: true },
  });
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i));
  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={`${bookings.length} gruppi · ${n(bookings.reduce((s, b) => s + b.pax, 0))} coperti nei prossimi 14 giorni`}
        actions={
          <>
            <LinkButton href={`?dal=${isoDay(addDays(from, -14))}`} size="sm">← 2 settimane</LinkButton>
            <LinkButton href="?" size="sm">Oggi</LinkButton>
            <LinkButton href={`?dal=${isoDay(to)}`} size="sm">2 settimane →</LinkButton>
          </>
        }
      />
      <div className="space-y-4">
        {days.map((d) => {
          const list = bookings.filter((b) => b.date.getTime() === d.getTime());
          const pax = list.reduce((s, b) => s + b.pax, 0);
          const weekend = [0, 6].includes(d.getUTCDay());
          return (
            <Card key={d.toISOString()} className={list.length ? "" : "opacity-70"}>
              <div className={`flex items-center justify-between border-b border-ink-100 px-5 py-3 ${weekend ? "bg-brand-50/50" : ""}`}>
                <div className="font-semibold first-letter:uppercase">{dayLong(d)}</div>
                <div className="text-sm text-ink-500">{list.length ? `${list.length} gruppi · ${n(pax)} coperti` : "Nessun gruppo"}</div>
              </div>
              {list.length > 0 && (
                <ul className="divide-y divide-ink-100">
                  {list.map((b) => (
                    <li key={b.id}>
                      <Link href={`/admin/prenotazioni/${b.code}`} className="grid grid-cols-[60px_1fr_auto] items-center gap-4 px-5 py-2.5 text-sm hover:bg-ink-50 sm:grid-cols-[60px_1fr_1fr_60px_auto]">
                        <span className="font-semibold tabular-nums">{b.time}</span>
                        <span className="truncate font-medium">{b.restaurant.name} <span className="font-normal text-ink-500">· {b.restaurant.city}</span></span>
                        <span className="hidden truncate text-ink-600 sm:block">{b.organizer?.name ?? b.contactName}{b.groupName ? ` · ${b.groupName}` : ""}</span>
                        <span className="hidden text-right tabular-nums sm:block">{b.pax}</span>
                        <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
