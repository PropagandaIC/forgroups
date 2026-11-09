import Link from "next/link";
import { AlertTriangle, ArrowRight, BellRing, CalendarClock, CircleDollarSign, Inbox, Sparkles, Store, Ticket, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Avatar, Badge, Card, CardHeader, Empty, LinkButton, Stat } from "@/components/ui";
import { ColumnChart } from "@/components/charts";
import { addDays, day, money, money0, n, relative, todayUTC } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/labels";

export default async function Oggi() {
  const user = await requireAdmin();
  const today = todayUTC();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const yearAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const live = { status: { in: ["CONFIRMED", "COMPLETED"] as ("CONFIRMED" | "COMPLETED")[] } };

  const [month, prevMonth, newInquiries, toConfirm, toCollect, upcoming, pendingOrgs, noStripe, events, history] = await Promise.all([
    db.booking.aggregate({ where: { ...live, date: { gte: monthStart, lt: addDays(monthStart, 32) } }, _sum: { totalCents: true, commissionCents: true, pax: true }, _count: true }),
    db.booking.aggregate({ where: { ...live, date: { gte: prevMonthStart, lt: monthStart } }, _sum: { totalCents: true } }),
    db.inquiry.findMany({ where: { stage: "NEW" }, orderBy: { createdAt: "asc" }, take: 6 }),
    db.booking.findMany({ where: { status: "REQUESTED" }, orderBy: { createdAt: "asc" }, take: 6, include: { restaurant: true, organizer: true } }),
    db.booking.findMany({
      where: { status: "CONFIRMED", paymentStatus: { not: "PAID" }, paymentMode: { in: ["ONLINE_FULL", "ONLINE_DEPOSIT"] }, date: { gte: today, lte: addDays(today, 14) } },
      orderBy: { date: "asc" },
      take: 6,
      include: { restaurant: true, organizer: true },
    }),
    db.booking.findMany({
      where: { status: "CONFIRMED", date: { gte: today, lt: addDays(today, 3) } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      include: { restaurant: true, organizer: true },
    }),
    db.organization.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 5 }),
    db.organization.count({ where: { kind: "RESTAURANT", status: "ACTIVE", stripeTransfersActive: false } }),
    db.event.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } }),
    db.booking.findMany({ where: { ...live, date: { gte: yearAgo, lt: addDays(monthStart, 32) } }, select: { date: true, totalCents: true } }),
  ]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }), value: 0, count: 0 };
  });
  for (const b of history) {
    const m = months.find((x) => x.key === b.date.toISOString().slice(0, 7));
    if (m) {
      m.value += b.totalCents;
      m.count++;
    }
  }
  const delta = prevMonth._sum.totalCents ? ((month._sum.totalCents ?? 0) / prevMonth._sum.totalCents - 1) * 100 : 0;
  const hour = Number(new Date().toLocaleString("it-IT", { hour: "numeric", hour12: false, timeZone: "Europe/Rome" }));
  const todo = newInquiries.length + toConfirm.length + toCollect.length + pendingOrgs.length;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-500">{new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" })}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera"}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {todo ? `Hai ${todo} cose che richiedono attenzione oggi.` : "Tutto in ordine: nessuna azione in sospeso."}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/admin/richieste/nuova" variant="dark"><Sparkles className="size-4" /> Richiesta da email</LinkButton>
          <LinkButton href="/admin/prenotazioni/nuova" variant="primary"><Ticket className="size-4" /> Nuova prenotazione</LinkButton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          accent
          label={`Prenotato a ${new Date().toLocaleDateString("it-IT", { month: "long", timeZone: "UTC" })}`}
          value={money0(month._sum.totalCents)}
          hint={`${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% rispetto al mese scorso`}
        />
        <Stat label="Provvigioni del mese" value={money0(month._sum.commissionCents)} hint="trattenute o da fatturare" icon={<CircleDollarSign className="size-4 text-brand-600" />} />
        <Stat label="Coperti del mese" value={n(month._sum.pax)} hint={`${month._count} gruppi`} />
        <Stat label="Da confermare" value={n(await db.booking.count({ where: { status: "REQUESTED" } }))} hint="in attesa del ristorante" icon={<BellRing className="size-4 text-amber-600" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              title="Richieste nuove"
              subtitle="Chi le prende per primo? Le più vecchie in alto."
              action={<Link href="/admin/richieste" className="text-xs font-medium text-brand-700 hover:underline">Pipeline →</Link>}
            />
            {newInquiries.length === 0 ? (
              <Empty icon={<Inbox className="size-5" />} title="Nessuna richiesta nuova" />
            ) : (
              <ul className="divide-y divide-ink-100">
                {newInquiries.map((q) => (
                  <li key={q.id}>
                    <Link href={`/admin/richieste/${q.code}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                      <Avatar name={q.contactName} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{q.contactName}{q.company ? ` · ${q.company}` : ""}</div>
                        <div className="truncate text-xs text-ink-500">
                          {[q.city, q.pax && `${q.pax} pers.`, q.date && day(q.date), q.groupType].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <span className="text-xs text-ink-400">{relative(q.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Da confermare dal ristorante" subtitle="Sollecita chi non ha ancora risposto" />
              <BookingList items={toConfirm} empty="Nessuna prenotazione in attesa" showAge />
            </Card>
            <Card>
              <CardHeader title="Pagamenti da sollecitare" subtitle="Confermate, non pagate, entro 14 giorni" />
              <BookingList items={toCollect} empty="Tutti i pagamenti sono in regola" showDue />
            </Card>
          </div>

          <Card>
            <CardHeader title="Andamento prenotato" subtitle="Valore delle prenotazioni confermate per mese di servizio, ultimi 12 mesi" />
            <div className="px-5 pt-8 pb-5">
              <ColumnChart label="Prenotato per mese" data={months.map((m) => ({ label: m.label, value: m.value, sub: `${m.count} gruppi` }))} format={money0} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Prossimi 3 giorni" subtitle={`${upcoming.length} gruppi · ${n(upcoming.reduce((s, b) => s + b.pax, 0))} coperti`} />
            {upcoming.length === 0 ? (
              <Empty icon={<CalendarClock className="size-5" />} title="Nessun gruppo in arrivo" />
            ) : (
              <ul className="max-h-96 divide-y divide-ink-100 overflow-y-auto">
                {upcoming.map((b) => (
                  <li key={b.id}>
                    <Link href={`/admin/prenotazioni/${b.code}`} className="flex gap-3 px-5 py-3 hover:bg-ink-50">
                      <div className="w-12 shrink-0 text-center">
                        <div className="text-[11px] font-medium text-ink-500 uppercase">{b.date.toLocaleDateString("it-IT", { weekday: "short", timeZone: "UTC" })}</div>
                        <div className="text-sm font-semibold">{b.time}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{b.restaurant.name}</div>
                        <div className="truncate text-xs text-ink-500">{b.pax} pers. · {b.organizer?.name ?? b.contactName}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(pendingOrgs.length > 0 || noStripe > 0) && (
            <Card>
              <CardHeader title="Rete" />
              <ul className="divide-y divide-ink-100 text-sm">
                {pendingOrgs.map((o) => (
                  <li key={o.id}>
                    <Link href={o.kind === "RESTAURANT" ? `/admin/ristoranti/${o.id}` : `/admin/organizzatori/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                      <UserPlus className="size-4 text-violet-600" />
                      <span className="flex-1 truncate">{o.name} <span className="text-ink-500">· da approvare</span></span>
                      <ArrowRight className="size-4 text-ink-400" />
                    </Link>
                  </li>
                ))}
                {noStripe > 0 && (
                  <li>
                    <Link href="/admin/ristoranti?stripe=no" className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                      <AlertTriangle className="size-4 text-amber-600" />
                      <span className="flex-1">{noStripe} ristoranti senza incassi online attivi</span>
                      <ArrowRight className="size-4 text-ink-400" />
                    </Link>
                  </li>
                )}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Attività recente" />
            <ul className="space-y-3 px-5 py-4">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                  <div className="min-w-0">
                    <div className="text-ink-800">{e.summary}</div>
                    <div className="text-xs text-ink-500">{e.user?.name ?? "Sistema"} · {relative(e.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

type BL = { id: string; code: string; date: Date; pax: number; totalCents: number; paidCents: number; createdAt: Date; status: keyof typeof BOOKING_STATUS; restaurant: { name: string }; organizer: { name: string } | null; contactName: string };

function BookingList({ items, empty, showAge, showDue }: { items: BL[]; empty: string; showAge?: boolean; showDue?: boolean }) {
  if (!items.length) return <Empty icon={<Store className="size-5" />} title={empty} />;
  return (
    <ul className="divide-y divide-ink-100">
      {items.map((b) => (
        <li key={b.id}>
          <Link href={`/admin/prenotazioni/${b.code}`} className="block px-5 py-3 hover:bg-ink-50">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{b.restaurant.name}</span>
              {showDue ? <span className="text-sm font-semibold tabular-nums">{money(b.totalCents - b.paidCents)}</span> : <Badge tone="amber">{relative(b.createdAt)}</Badge>}
            </div>
            <div className="mt-0.5 truncate text-xs text-ink-500">
              {b.code} · {day(b.date)} · {b.pax} pers. · {b.organizer?.name ?? b.contactName}
              {showAge ? "" : ""}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
