import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, Phone, Ticket } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionButton, ActionForm } from "@/components/action-form";
import { Badge, Card, CardHeader, Field, LinkButton, Stat } from "@/components/ui";
import { setOrgStatusAction, saveOrgAction } from "@/app/actions/org";
import { day, money, money0, n, relative } from "@/lib/format";
import { BOOKING_STATUS, INQUIRY_STAGE, ORGANIZER_TYPES } from "@/lib/labels";

export default async function Organizzatore({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const o = await db.organization.findUnique({
    where: { id },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      bookingsAsClient: { orderBy: { date: "desc" }, take: 30, include: { restaurant: true } },
      inquiries: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!o || o.kind !== "ORGANIZER") notFound();
  const agg = await db.booking.aggregate({ where: { organizerId: id, status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { totalCents: true, pax: true, commissionCents: true }, _count: true });
  const favRestaurants = await db.booking.groupBy({ by: ["restaurantId"], where: { organizerId: id }, _count: true, orderBy: { _count: { restaurantId: "desc" } }, take: 5 });
  const favNames = await db.organization.findMany({ where: { id: { in: favRestaurants.map((f) => f.restaurantId) } } });

  return (
    <>
      <Link href="/admin/organizzatori" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"><ChevronLeft className="size-4" /> Agenzie e clienti</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{o.name}</h1>
            <Badge tone={o.status === "ACTIVE" ? "green" : o.status === "PENDING" ? "violet" : "gray"}>{o.status === "ACTIVE" ? "Attivo" : o.status === "PENDING" ? "Da approvare" : "Disattivato"}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">{o.organizerType ? ORGANIZER_TYPES[o.organizerType] : ""} · {o.city} · cliente dal {day(o.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {o.status !== "ACTIVE" && <ActionButton run={setOrgStatusAction.bind(null, o.id, "ACTIVE")} variant="primary">Approva e attiva</ActionButton>}
          {o.status === "ACTIVE" && <ActionButton run={setOrgStatusAction.bind(null, o.id, "DISABLED")} variant="danger" confirm="Disattivare l'account? Gli utenti non potranno più accedere.">Disattiva</ActionButton>}
          <LinkButton href="/admin/prenotazioni/nuova" variant="dark"><Ticket className="size-4" /> Prenota per loro</LinkButton>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Valore prenotato" value={money0(agg._sum.totalCents)} accent />
        <Stat label="Prenotazioni" value={n(agg._count)} />
        <Stat label="Coperti" value={n(agg._sum.pax)} />
        <Stat label="Provvigioni generate" value={money0(agg._sum.commissionCents)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Prenotazioni" />
            <ul className="divide-y divide-ink-100 text-sm">
              {o.bookingsAsClient.length === 0 && <li className="px-5 py-4 text-ink-500">Nessuna prenotazione.</li>}
              {o.bookingsAsClient.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/prenotazioni/${b.code}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-ink-50">
                    <span className="w-28 shrink-0">{day(b.date)}</span>
                    <span className="flex-1 truncate font-medium">{b.restaurant.name}</span>
                    <span className="w-16 text-right tabular-nums">{b.pax} p.</span>
                    <span className="w-24 text-right tabular-nums">{money(b.totalCents)}</span>
                    <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Richieste" />
            <ul className="divide-y divide-ink-100 text-sm">
              {o.inquiries.length === 0 && <li className="px-5 py-4 text-ink-500">Nessuna richiesta.</li>}
              {o.inquiries.map((q) => (
                <li key={q.id}>
                  <Link href={`/admin/richieste/${q.code}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-ink-50">
                    <span className="w-20 shrink-0 text-ink-500">{q.code}</span>
                    <span className="flex-1 truncate">{[q.city, q.pax && `${q.pax} pers.`, q.date && day(q.date)].filter(Boolean).join(" · ")}</span>
                    <span className="text-xs text-ink-500">{relative(q.createdAt)}</span>
                    <Badge tone={INQUIRY_STAGE[q.stage].tone}>{INQUIRY_STAGE[q.stage].label}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Utenti" />
            <ul className="divide-y divide-ink-100 text-sm">
              {o.members.map((m) => (
                <li key={m.id} className="px-5 py-3">
                  <div className="flex items-center justify-between"><span className="font-medium">{m.name}</span><Badge tone={m.status === "ACTIVE" ? "green" : m.status === "PENDING" ? "violet" : "gray"} dot={false}>{m.status === "ACTIVE" ? "attivo" : m.status === "PENDING" ? "in attesa" : "disattivo"}</Badge></div>
                  <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 text-ink-600 hover:underline"><Mail className="size-3.5" />{m.email}</a>
                  {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 text-ink-600"><Phone className="size-3.5" />{m.phone}</a>}
                  <div className="text-xs text-ink-400">Ultimo accesso: {m.lastLoginAt ? relative(m.lastLoginAt) : "mai"}</div>
                </li>
              ))}
            </ul>
          </Card>
          {favNames.length > 0 && (
            <Card>
              <CardHeader title="Ristoranti preferiti" />
              <ul className="space-y-1 px-5 py-3 text-sm">
                {favRestaurants.map((f) => <li key={f.restaurantId} className="flex justify-between"><span>{favNames.find((x) => x.id === f.restaurantId)?.name}</span><span className="text-ink-500">{f._count}×</span></li>)}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader title="Anagrafica" />
            <div className="p-5">
              <ActionForm action={saveOrgAction} hidden={{ orgId: o.id }}>
                <Field label="Nome"><input name="name" defaultValue={o.name} className="input" /></Field>
                <Field label="Tipo">
                  <select name="organizerType" defaultValue={o.organizerType ?? ""} className="input">{Object.entries(ORGANIZER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Email"><input name="email" defaultValue={o.email ?? ""} className="input" /></Field>
                  <Field label="Telefono"><input name="phone" defaultValue={o.phone ?? ""} className="input" /></Field>
                  <Field label="Città"><input name="city" defaultValue={o.city ?? ""} className="input" /></Field>
                  <Field label="P. IVA"><input name="vatNumber" defaultValue={o.vatNumber ?? ""} className="input" /></Field>
                </div>
                <Field label="Note interne"><textarea name="internalNotes" rows={3} defaultValue={o.internalNotes ?? ""} className="input" /></Field>
              </ActionForm>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
