import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, Clock, FileText, Gift, Lock, MapPin, Phone, Users, UtensilsCrossed } from "lucide-react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { bookingRole } from "@/lib/permissions";
import { amountDue } from "@/lib/pricing";
import { dayLong, money, pct, relative, stamp, isoDay } from "@/lib/format";
import { BOOKING_STATUS, GROUP_TYPES, PAYMENT_MODE, PAYMENT_STATUS } from "@/lib/labels";
import { Avatar, Badge, Card, CardHeader, Field, LinkButton } from "./ui";
import { EditBookingForm, ManualPaymentForm, MessageComposer, PayButton, PaymentLinkButton, StatusButton } from "./booking-client";

type Course = { course: string; items: string[] };

export async function BookingDetail({ code, user, basePath, flash }: { code: string; user: CurrentUser; basePath: string; flash?: string }) {
  const b = await db.booking.findUnique({
    where: { code },
    include: {
      restaurant: true,
      organizer: true,
      menu: true,
      room: true,
      service: true,
      payments: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { include: { organization: true } } } },
      createdBy: true,
    },
  });
  if (!b) notFound();
  const role = bookingRole(user, b);
  if (!role) notFound();
  const isAdmin = role === "admin";

  const [events, menus] = await Promise.all([
    db.event.findMany({ where: { entityType: "booking", entityId: b.id }, orderBy: { createdAt: "desc" }, include: { user: true } }),
    isAdmin ? db.menu.findMany({ where: { restaurantId: b.restaurantId }, orderBy: { position: "asc" } }) : Promise.resolve([]),
  ]);
  const messages = b.messages.filter((m) => isAdmin || !m.internal);
  const feesCollected = b.payments.filter((p) => p.status === "SUCCEEDED").reduce((s, p) => s + p.applicationFeeCents, 0);
  const due = amountDue({ ...b, feesCollectedCents: feesCollected });
  const courses: Course[] = b.menu?.courses ? JSON.parse(b.menu.courses) : [];
  const st = BOOKING_STATUS[b.status];
  const canEditGroup = (isAdmin || role === "organizer") && !["COMPLETED", "CANCELLED", "DECLINED"].includes(b.status);
  const restaurantNet = b.totalCents - b.commissionCents;

  return (
    <>
      <Link href={basePath} className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
        <ChevronLeft className="size-4" /> Prenotazioni
      </Link>

      {flash === "ok" && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Pagamento ricevuto, grazie! La ricevuta arriva via email da Stripe; lo stato si aggiorna entro pochi secondi.</div>}
      {flash === "annullato" && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Pagamento annullato. Puoi riprovare quando vuoi.</div>}
      {flash === "nuova" && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Prenotazione inviata! Il ristorante la confermerà a breve: riceverai una notifica e potrai pagare online da questa pagina.
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{b.groupName || b.contactName}</h1>
            <Badge tone={st.tone}>{st.label}</Badge>
            {b.paymentMode !== "ON_SITE" && <Badge tone={PAYMENT_STATUS[b.paymentStatus].tone}>{PAYMENT_STATUS[b.paymentStatus].label}</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {b.code} · {b.restaurant.name}, {b.restaurant.city} · creata {relative(b.createdAt)}
            {b.createdBy ? ` da ${b.createdBy.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {(role === "restaurant" || isAdmin) && b.status === "REQUESTED" && (
            <>
              <StatusButton bookingId={b.id} to="CONFIRMED" label="Conferma" variant="primary" />
              <StatusButton bookingId={b.id} to="DECLINED" label="Rifiuta" variant="danger" askReason="Motivo del rifiuto (verrà inviato al cliente):" />
            </>
          )}
          {(role === "restaurant" || isAdmin) && b.status === "CONFIRMED" && (
            <>
              <StatusButton bookingId={b.id} to="COMPLETED" label="Segna come servita" />
              <StatusButton bookingId={b.id} to="NO_SHOW" label="No show" variant="danger" confirm="Il gruppo non si è presentato?" />
            </>
          )}
          {(role === "organizer" || isAdmin) && ["REQUESTED", "CONFIRMED"].includes(b.status) && (
            <StatusButton bookingId={b.id} to="CANCELLED" label="Annulla" variant="danger" askReason="Motivo dell'annullamento:" />
          )}
          {isAdmin && ["DECLINED", "CANCELLED"].includes(b.status) && <StatusButton bookingId={b.id} to="REQUESTED" label="Riapri" />}
          {b.status !== "DECLINED" && (
            <LinkButton href={`/voucher/${b.code}`} target="_blank" variant="secondary">
              <FileText className="size-4" /> Voucher
            </LinkButton>
          )}
        </div>
      </div>

      {role === "organizer" && b.status === "CONFIRMED" && due && (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-ink-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-ink-300">{due.kind === "deposit" ? "Acconto richiesto" : due.kind === "balance" ? "Saldo da pagare" : "Importo da pagare"}</div>
            <div className="text-3xl font-semibold">{money(due.amountCents)}</div>
            <div className="text-xs text-ink-400">Pagamento sicuro con Stripe: carta, Apple Pay, Google Pay, bonifico istantaneo.</div>
          </div>
          <PayButton bookingId={b.id} returnPath={`${basePath}/${b.code}`} label="Paga ora" />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <div className="grid gap-px overflow-hidden rounded-t-2xl bg-ink-100 sm:grid-cols-4">
              {[
                [CalendarDays, "Data", dayLong(b.date)],
                [Clock, "Orario", `${b.time}${b.service ? ` · ${b.service.kind}` : ""}`],
                [Users, "Persone", `${b.pax}${b.freePax ? ` (di cui ${b.freePax} gratuità)` : ""}`],
                [MapPin, "Sala", b.room?.name ?? "—"],
              ].map(([Icon, l, v], i) => {
                const I = Icon as typeof Clock;
                return (
                  <div key={i} className="bg-white p-4">
                    <div className="flex items-center gap-1.5 text-xs text-ink-500"><I className="size-3.5" /> {l as string}</div>
                    <div className="mt-1 text-sm font-medium first-letter:uppercase">{v as string}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-6 p-5 md:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase"><UtensilsCrossed className="size-3.5" /> {b.menu?.name ?? "Menu da definire"}</h3>
                <dl className="mt-2 space-y-1.5 text-sm">
                  {courses.map((c) => (
                    <div key={c.course}><dt className="inline font-medium">{c.course}: </dt><dd className="inline text-ink-600">{c.items.join(", ")}</dd></div>
                  ))}
                </dl>
                {b.dietaryNotes && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">⚠ {b.dietaryNotes}</p>}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-ink-500">Cliente</div>
                  <div className="font-medium">{b.organizer?.name ?? "Cliente diretto"}</div>
                  <div className="text-ink-600">{b.contactName}{b.contactPhone ? ` · ${b.contactPhone}` : ""}</div>
                  {b.contactEmail && <div className="text-ink-600">{b.contactEmail}</div>}
                </div>
                {(b.groupLeader || b.groupType) && (
                  <div>
                    <div className="text-xs text-ink-500">Gruppo</div>
                    <div>{[b.groupType, b.language?.toUpperCase()].filter(Boolean).join(" · ")}</div>
                    {b.groupLeader && (
                      <div className="flex items-center gap-1 text-ink-600"><Phone className="size-3.5" /> Capogruppo: {b.groupLeader} {b.groupLeaderPhone}</div>
                    )}
                  </div>
                )}
                {b.notes && (
                  <div>
                    <div className="text-xs text-ink-500">Note</div>
                    <div className="whitespace-pre-line text-ink-700">{b.notes}</div>
                  </div>
                )}
                {isAdmin && b.internalNotes && (
                  <div className="rounded-lg bg-ink-50 p-2">
                    <div className="flex items-center gap-1 text-xs text-ink-500"><Lock className="size-3" /> Note interne</div>
                    <div className="whitespace-pre-line">{b.internalNotes}</div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Conversazione" subtitle={isAdmin ? "Cliente, ristorante e staff vedono i messaggi; le note interne solo lo staff" : "Messaggi con ForGroups e il ristorante"} />
            <div className="space-y-4 p-5">
              {messages.length === 0 && <p className="text-sm text-ink-500">Nessun messaggio.</p>}
              {messages.map((m) => {
                const mine = m.authorId === user.id;
                const who = m.author ? (m.author.role === "ADMIN" ? `${m.author.name} · ForGroups` : `${m.author.name} · ${m.author.organization?.name ?? ""}`) : "Sistema";
                return (
                  <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                    <Avatar name={m.author?.name ?? "FG"} />
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.internal ? "bg-amber-50 ring-1 ring-amber-200" : mine ? "bg-ink-900 text-white" : "bg-ink-100"}`}>
                      <div className={`mb-0.5 text-xs ${mine && !m.internal ? "text-ink-400" : "text-ink-500"}`}>
                        {m.internal && <Lock className="mr-1 inline size-3" />}
                        {who} · {stamp(m.createdAt)}
                      </div>
                      <div className="whitespace-pre-line">{m.body}</div>
                    </div>
                  </div>
                );
              })}
              <MessageComposer bookingId={b.id} canInternal={isAdmin} />
            </div>
          </Card>

          {canEditGroup && (
            <Card>
              <details>
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">{isAdmin ? "Modifica prenotazione" : "Aggiorna i dati del gruppo"}</summary>
                <div className="border-t border-ink-100 p-5">
                  <EditBookingForm bookingId={b.id}>
                    {isAdmin && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Data"><input type="date" name="date" defaultValue={isoDay(b.date)} className="input" /></Field>
                        <Field label="Ora"><input type="time" name="time" defaultValue={b.time} className="input" /></Field>
                        <Field label="Persone"><input type="number" name="pax" defaultValue={b.pax} className="input" /></Field>
                        <Field label="Menu">
                          <select name="menuId" defaultValue={b.menuId ?? ""} className="input">
                            {menus.map((m) => <option key={m.id} value={m.id}>{m.name} ({money(m.priceCents)})</option>)}
                          </select>
                        </Field>
                        <Field label="Prezzo a persona (€)"><input name="priceEur" defaultValue={(b.priceCents / 100).toFixed(2)} className="input" /></Field>
                        <Field label="Extra (€ totali)"><input name="extrasEur" defaultValue={(b.extrasCents / 100).toFixed(2)} className="input" /></Field>
                        <Field label="Provvigione (%)"><input name="commissionPct" defaultValue={(b.commissionRate / 100).toString()} className="input" /></Field>
                        <Field label="Modalità di pagamento">
                          <select name="paymentMode" defaultValue={b.paymentMode} className="input">
                            {Object.entries(PAYMENT_MODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </Field>
                        <Field label="Acconto (%)"><input name="depositPercent" defaultValue={b.depositPercent ?? 30} className="input" /></Field>
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nome gruppo"><input name="groupName" defaultValue={b.groupName ?? ""} className="input" /></Field>
                      <Field label="Tipo di gruppo">
                        <select name="groupType" defaultValue={b.groupType ?? ""} className="input">
                          <option value="">—</option>
                          {GROUP_TYPES.map((g) => <option key={g}>{g}</option>)}
                        </select>
                      </Field>
                      <Field label="Referente"><input name="contactName" defaultValue={b.contactName} className="input" /></Field>
                      <Field label="Telefono referente"><input name="contactPhone" defaultValue={b.contactPhone ?? ""} className="input" /></Field>
                      <Field label="Capogruppo"><input name="groupLeader" defaultValue={b.groupLeader ?? ""} className="input" /></Field>
                      <Field label="Cellulare capogruppo"><input name="groupLeaderPhone" defaultValue={b.groupLeaderPhone ?? ""} className="input" /></Field>
                    </div>
                    <Field label="Allergie e intolleranze"><input name="dietaryNotes" defaultValue={b.dietaryNotes ?? ""} className="input" /></Field>
                    <Field label="Note per il ristorante"><textarea name="notes" rows={2} defaultValue={b.notes ?? ""} className="input" /></Field>
                    {isAdmin && <Field label="Note interne (solo staff)"><textarea name="internalNotes" rows={2} defaultValue={b.internalNotes ?? ""} className="input" /></Field>}
                  </EditBookingForm>
                </div>
              </details>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Importi" subtitle={PAYMENT_MODE[b.paymentMode]} />
            <dl className="space-y-2 px-5 py-4 text-sm">
              <Row label={`${b.pax - b.freePax} paganti × ${money(b.priceCents)}`} value={money((b.pax - b.freePax) * b.priceCents)} />
              {b.freePax > 0 && <Row label={<span className="flex items-center gap-1 text-emerald-700"><Gift className="size-3.5" /> {b.freePax} gratuità</span>} value="incluse" />}
              {b.extrasCents > 0 && <Row label="Extra" value={money(b.extrasCents)} />}
              <div className="border-t border-ink-100 pt-2"><Row label={<b>Totale</b>} value={<b className="text-base">{money(b.totalCents)}</b>} /></div>
              {(isAdmin || role === "agent") && <Row label={`Provvigione ForGroups (${pct(b.commissionRate)})`} value={money(b.commissionCents)} />}
              {(isAdmin || role === "restaurant") && <Row label="Netto ristorante" value={money(restaurantNet)} />}
              <Row label="Incassato" value={<span className="text-emerald-700">{money(b.paidCents)}</span>} />
              {b.totalCents - b.paidCents > 0 && <Row label="Da incassare" value={money(b.totalCents - b.paidCents)} />}
            </dl>
            {b.payments.length > 0 && (
              <ul className="space-y-2 border-t border-ink-100 px-5 py-4 text-xs">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-ink-600">
                      {p.method === "stripe" ? "Online" : p.method} · {p.kind === "deposit" ? "acconto" : p.kind === "balance" ? "saldo" : p.kind === "manual" ? "manuale" : "totale"} · {stamp(p.paidAt ?? p.createdAt)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium tabular-nums">{money(p.amountCents)}</span>
                      <Badge tone={p.status === "SUCCEEDED" ? "green" : p.status === "PENDING" ? "amber" : "gray"} dot={false}>
                        {p.status === "SUCCEEDED" ? "ok" : p.status === "PENDING" ? "in attesa" : p.status.toLowerCase()}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {isAdmin && b.status === "CONFIRMED" && b.totalCents > b.paidCents && (
              <div className="space-y-3 border-t border-ink-100 px-5 py-4">
                {due && <PaymentLinkButton bookingId={b.id} />}
                <ManualPaymentForm bookingId={b.id} due={b.totalCents - b.paidCents} />
              </div>
            )}
            {role === "restaurant" && b.paymentMode !== "ON_SITE" && (
              <p className="border-t border-ink-100 px-5 py-3 text-xs text-ink-500">
                I pagamenti online arrivano sul tuo conto Stripe già al netto della provvigione.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title="Storico" />
            <ol className="relative space-y-4 px-5 py-4 before:absolute before:top-5 before:bottom-5 before:left-[23px] before:w-px before:bg-ink-200">
              {events.map((e) => (
                <li key={e.id} className="relative flex gap-3 pl-0 text-sm">
                  <span className="relative z-10 mt-1 size-2.5 shrink-0 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
                  <div>
                    <div className="text-ink-800">{e.summary}</div>
                    <div className="text-xs text-ink-500">{e.user?.name ?? "Sistema"} · {stamp(e.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-600">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
