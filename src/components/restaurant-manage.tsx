import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink, Gift } from "lucide-react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { occupancy } from "@/lib/availability";
import { stripeEnabled } from "@/lib/stripe";
import { addDays, day, isoDay, money, money0, n, pct, stamp } from "@/lib/format";
import { BOOKING_STATUS, PAYMENT_MODE, SERVICE_KINDS } from "@/lib/labels";
import { heatColor } from "./charts";
import { ActionButton, ActionForm } from "./action-form";
import { Badge, Card, CardHeader, Field, Stat } from "./ui";
import {
  saveMenuAction, saveOrgAction, saveRoomAction, saveServiceAction, setOrgStatusAction,
  stripeDashboardAction, stripeOnboardAction, stripeRefreshAction, toggleServiceAction,
} from "@/app/actions/org";

const TABS = [
  ["panoramica", "Panoramica"],
  ["scheda", "Scheda pubblica"],
  ["offerta", "Sale, servizi e menu"],
  ["pagamenti", "Pagamenti e contratto"],
] as const;
export type RestaurantTab = (typeof TABS)[number][0];
const WD = ["L", "M", "M", "G", "V", "S", "D"];
type Course = { course: string; items: string[] };

export async function RestaurantManage({ orgId, user, tab, basePath, flash }: { orgId: string; user: CurrentUser; tab: RestaurantTab; basePath: string; flash?: string }) {
  const isAdmin = user.role === "ADMIN";
  const r = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      agent: true,
      members: true,
      rooms: { orderBy: { capacity: "desc" } },
      services: { include: { room: true }, orderBy: [{ kind: "asc" }, { startTime: "asc" }] },
      menus: { orderBy: [{ active: "desc" }, { position: "asc" }], include: { services: true } },
    },
  });
  if (!r || r.kind !== "RESTAURANT") notFound();

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{r.name}</h1>
            <Badge tone={r.status === "ACTIVE" ? "green" : r.status === "PENDING" ? "violet" : "gray"}>{r.status === "ACTIVE" ? "Attivo" : r.status === "PENDING" ? "Da approvare" : "Disattivato"}</Badge>
            <Badge tone={r.stripeTransfersActive ? "green" : "amber"}>{r.stripeTransfersActive ? "Incassi online attivi" : "Incassi online non attivi"}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {r.address}, {r.city} · provvigione {pct(r.commissionRate)}{r.agent ? ` · agente ${r.agent.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/ristoranti/${r.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-sm font-medium shadow-sm hover:bg-ink-50">
            <ExternalLink className="size-4" /> Vedi pagina
          </Link>
          {isAdmin && r.status !== "ACTIVE" && <ActionButton run={setOrgStatusAction.bind(null, r.id, "ACTIVE")} variant="primary">Attiva</ActionButton>}
          {isAdmin && r.status === "ACTIVE" && (
            <ActionButton run={setOrgStatusAction.bind(null, r.id, "DISABLED")} variant="danger" confirm="Disattivare il ristorante? Non sarà più visibile né prenotabile.">Disattiva</ActionButton>
          )}
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-200 text-sm font-medium">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`${basePath}?tab=${k}`} className={`-mb-px border-b-2 px-3 py-2.5 whitespace-nowrap ${tab === k ? "border-brand-500 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-800"}`}>
            {label}
          </Link>
        ))}
      </div>

      {flash === "return" && (
        <div className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">Bentornato da Stripe! Premi “Verifica stato” per aggiornare lo stato degli incassi.</div>
      )}

      {tab === "panoramica" && <Overview id={r.id} />}
      {tab === "scheda" && <PublicProfile r={r} isAdmin={isAdmin} />}
      {tab === "offerta" && <Offer r={r} />}
      {tab === "pagamenti" && <Payments r={r} isAdmin={isAdmin} basePath={basePath} />}
    </>
  );
}

async function Overview({ id }: { id: string }) {
  const now = new Date();
  const yearAgo = addDays(now, -365);
  const [stats, upcoming, occ] = await Promise.all([
    db.booking.aggregate({ where: { restaurantId: id, status: { in: ["CONFIRMED", "COMPLETED"] }, date: { gte: yearAgo } }, _sum: { totalCents: true, commissionCents: true, pax: true }, _count: true }),
    db.booking.findMany({ where: { restaurantId: id, date: { gte: addDays(now, -1) }, status: { in: ["REQUESTED", "CONFIRMED"] } }, orderBy: [{ date: "asc" }, { time: "asc" }], take: 10, include: { organizer: true } }),
    occupancy(id, 21),
  ]);
  const days = Array.from({ length: occ.days }, (_, i) => addDays(occ.from, i));
  const booked = (sid: string, d: Date) => occ.bookings.filter((b) => b.serviceId === sid && b.date.getTime() === d.getTime()).reduce((s, b) => s + b.pax, 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Prenotato ultimi 12 mesi" value={money0(stats._sum.totalCents)} accent />
        <Stat label="Gruppi" value={n(stats._count)} />
        <Stat label="Coperti" value={n(stats._sum.pax)} />
        <Stat label="Provvigioni generate" value={money0(stats._sum.commissionCents)} />
      </div>
      <Card>
        <CardHeader title="Occupazione prossime 3 settimane" subtitle="Posti prenotati sulla capienza della sala, per servizio. Più scuro = più pieno." />
        <div className="overflow-x-auto p-5">
          <table className="border-separate border-spacing-[2px] text-xs">
            <thead>
              <tr>
                <th />
                {days.map((d) => (
                  <th key={d.toISOString()} className={`w-9 font-normal ${[0, 6].includes(d.getUTCDay()) ? "text-ink-900" : "text-ink-400"}`}>
                    <div>{WD[(d.getUTCDay() + 6) % 7]}</div>
                    <div className="tabular-nums">{d.getUTCDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {occ.services.map((s) => (
                <tr key={s.id}>
                  <th className="pr-3 text-left font-medium whitespace-nowrap text-ink-700">{s.kind} · {s.room.name}</th>
                  {days.map((d) => {
                    const v = booked(s.id, d);
                    const ratio = v / s.room.capacity;
                    const closed = !s.weekdays.includes(String(((d.getUTCDay() + 6) % 7) + 1));
                    return (
                      <td key={d.toISOString()} title={`${day(d)} · ${s.kind}: ${v}/${s.room.capacity} posti`} className="h-8 w-9 rounded-[4px] text-center align-middle tabular-nums" style={{ background: closed ? "repeating-linear-gradient(45deg, var(--color-ink-100), var(--color-ink-100) 3px, white 3px, white 6px)" : heatColor(ratio), color: ratio > 0.6 ? "white" : "var(--color-ink-700)" }}>
                        {v > 0 ? v : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-500">
            <span>Libero</span>
            {[0.05, 0.25, 0.45, 0.6, 0.8, 0.99].map((x) => <span key={x} className="h-3 w-5 rounded-sm" style={{ background: heatColor(x) }} />)}
            <span>Pieno</span>
            <span className="ml-3 h-3 w-5 rounded-sm" style={{ background: "repeating-linear-gradient(45deg, var(--color-ink-200), var(--color-ink-200) 2px, white 2px, white 4px)" }} />
            <span>Chiuso</span>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Prossime prenotazioni" />
        <ul className="divide-y divide-ink-100 text-sm">
          {upcoming.length === 0 && <li className="px-5 py-4 text-ink-500">Nessuna prenotazione in arrivo.</li>}
          {upcoming.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-28 shrink-0 font-medium">{day(b.date)} {b.time}</span>
              <span className="flex-1 truncate">{b.organizer?.name ?? b.contactName} · {b.pax} pers.</span>
              <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

type R = Prisma.OrganizationGetPayload<{
  include: { agent: true; members: true; rooms: true; services: { include: { room: true } }; menus: { include: { services: true } } };
}>;

function PublicProfile({ r, isAdmin }: { r: R; isAdmin: boolean }) {
  const images: string[] = r.images ? JSON.parse(r.images) : [];
  return (
    <Card className="p-5">
      <ActionForm action={saveOrgAction} hidden={{ orgId: r.id }}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome"><input name="name" defaultValue={r.name} className="input" /></Field>
          {isAdmin && <Field label="Indirizzo pagina (slug)" hint={`forgroups.it/ristoranti/${r.slug}`}><input name="slug" defaultValue={r.slug} className="input" /></Field>}
          <Field label="Indirizzo"><input name="address" defaultValue={r.address ?? ""} className="input" /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="CAP"><input name="zip" defaultValue={r.zip ?? ""} className="input" /></Field>
            <Field label="Città"><input name="city" defaultValue={r.city ?? ""} className="input" /></Field>
            <Field label="Prov."><input name="province" defaultValue={r.province ?? ""} className="input" /></Field>
          </div>
          <Field label="Email prenotazioni"><input name="email" defaultValue={r.email ?? ""} className="input" /></Field>
          <Field label="Telefono"><input name="phone" defaultValue={r.phone ?? ""} className="input" /></Field>
          <Field label="Tipo di cucina"><input name="cuisine" defaultValue={r.cuisine ?? ""} placeholder="Romana, Pizza" className="input" /></Field>
          <Field label="Adatto a (separati da virgola)"><input name="tags" defaultValue={r.tags ?? ""} placeholder="Studenti, Pellegrini, Incentive" className="input" /></Field>
          <Field label="Orari di apertura"><input name="openingHours" defaultValue={r.openingHours ?? ""} className="input" /></Field>
          <Field label="Frase di presentazione"><input name="tagline" defaultValue={r.tagline ?? ""} className="input" /></Field>
        </div>
        <Field label="Descrizione (italiano)"><textarea name="description" rows={5} defaultValue={r.description ?? ""} className="input" /></Field>
        <Field label="Description (English)"><textarea name="descriptionEn" rows={4} defaultValue={r.descriptionEn ?? ""} className="input" /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Foto principale (URL)"><input name="coverImage" defaultValue={r.coverImage ?? ""} className="input" /></Field>
          <Field label="Galleria (un URL per riga)"><textarea name="images" rows={3} defaultValue={images.join("\n")} className="input" /></Field>
        </div>
      </ActionForm>
    </Card>
  );
}

function Offer({ r }: { r: R }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Sale" subtitle="La capienza di ogni sala determina i posti prenotabili per servizio" />
        <div className="space-y-3 p-5">
          {r.rooms.map((room) => (
            <ActionForm key={room.id} action={saveRoomAction} hidden={{ orgId: r.id, id: room.id }} submit="Aggiorna" className="grid items-end gap-2 sm:grid-cols-[1fr_120px_2fr_auto]">
              <Field label="Nome"><input name="name" defaultValue={room.name} className="input" /></Field>
              <Field label="Posti"><input name="capacity" type="number" defaultValue={room.capacity} className="input" /></Field>
              <Field label="Descrizione"><input name="description" defaultValue={room.description ?? ""} className="input" /></Field>
            </ActionForm>
          ))}
          <details className="rounded-xl border border-dashed border-ink-300 p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Aggiungi sala</summary>
            <ActionForm action={saveRoomAction} hidden={{ orgId: r.id }} submit="Crea sala" className="mt-3 grid items-end gap-2 sm:grid-cols-[1fr_120px_2fr_auto]">
              <Field label="Nome"><input name="name" required className="input" /></Field>
              <Field label="Posti"><input name="capacity" type="number" required className="input" /></Field>
              <Field label="Descrizione"><input name="description" className="input" /></Field>
            </ActionForm>
          </details>
        </div>
      </Card>

      <Card>
        <CardHeader title="Servizi e disponibilità" subtitle="Ogni servizio è una fascia oraria in una sala, nei giorni indicati" />
        <div className="space-y-3 p-5">
          {r.services.map((s) => <ServiceForm key={s.id} r={r} s={s} />)}
          <details className="rounded-xl border border-dashed border-ink-300 p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Aggiungi servizio</summary>
            <div className="mt-3"><ServiceForm r={r} /></div>
          </details>
        </div>
      </Card>

      <Card>
        <CardHeader title="Menu per gruppi" subtitle="Scrivi le portate una per riga, es. “Primo: carbonara, amatriciana”" />
        <div className="space-y-3 p-5">
          {r.menus.map((m) => <MenuForm key={m.id} r={r} m={m} />)}
          <details className="rounded-xl border border-dashed border-ink-300 p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">+ Aggiungi menu</summary>
            <div className="mt-3"><MenuForm r={r} /></div>
          </details>
        </div>
      </Card>
    </div>
  );
}

function ServiceForm({ r, s }: { r: R; s?: R["services"][number] }) {
  return (
    <details className={`rounded-xl border p-3 ${s && !s.active ? "border-ink-200 bg-ink-50 opacity-70" : "border-ink-200"}`} open={!s}>
      {s && (
        <summary className="flex cursor-pointer items-center gap-3 text-sm">
          <span className="font-medium">{s.kind}</span>
          <span className="text-ink-500">{s.startTime}–{s.endTime} · {s.room.name} ({s.room.capacity} posti)</span>
          <span className="flex gap-0.5">
            {WD.map((d, i) => <span key={i} className={`flex size-5 items-center justify-center rounded text-[10px] font-semibold ${s.weekdays.includes(String(i + 1)) ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-400"}`}>{d}</span>)}
          </span>
          {!s.active && <Badge tone="gray">Sospeso</Badge>}
        </summary>
      )}
      <ActionForm action={saveServiceAction} hidden={{ orgId: r.id, ...(s ? { id: s.id } : {}) }} className="mt-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-4">
          <Field label="Servizio">
            <select name="kind" defaultValue={s?.kind ?? "Pranzo"} className="input">{SERVICE_KINDS.map((k) => <option key={k}>{k}</option>)}</select>
          </Field>
          <Field label="Sala">
            <select name="roomId" defaultValue={s?.roomId} className="input">{r.rooms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          </Field>
          <Field label="Dalle"><input type="time" name="startTime" defaultValue={s?.startTime ?? "12:00"} className="input" /></Field>
          <Field label="Alle"><input type="time" name="endTime" defaultValue={s?.endTime ?? "15:00"} className="input" /></Field>
          <Field label="Valido dal"><input type="date" name="validFrom" defaultValue={s?.validFrom ? isoDay(s.validFrom) : ""} className="input" /></Field>
          <Field label="Fino al"><input type="date" name="validTo" defaultValue={s?.validTo ? isoDay(s.validTo) : ""} className="input" /></Field>
          <Field label="Prenotabile fino a (ore prima)"><input type="number" name="leadTimeHours" defaultValue={s?.leadTimeHours ?? 24} className="input" /></Field>
          <Field label="Stato">
            <select name="active" defaultValue={s?.active === false ? "off" : "on"} className="input"><option value="on">Attivo</option><option value="off">Sospeso</option></select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {WD.map((d, i) => (
            <label key={i} className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm">
              <input type="checkbox" name={`wd${i + 1}`} defaultChecked={s ? s.weekdays.includes(String(i + 1)) : true} className="accent-brand-500" />
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][i]}
            </label>
          ))}
        </div>
      </ActionForm>
      {s && (
        <div className="mt-2">
          <ActionButton run={toggleServiceAction.bind(null, r.id, s.id, !s.active)} size="sm" variant="ghost">{s.active ? "Sospendi (es. chiusura per ferie)" : "Riattiva"}</ActionButton>
        </div>
      )}
    </details>
  );
}

function MenuForm({ r, m }: { r: R; m?: R["menus"][number] }) {
  const courses: Course[] = m?.courses ? JSON.parse(m.courses) : [];
  const linked = new Set(m?.services.map((x) => x.serviceId) ?? r.services.map((s) => s.id));
  return (
    <details className={`rounded-xl border p-3 ${m && !m.active ? "bg-ink-50 opacity-70" : ""} border-ink-200`} open={!m}>
      {m && (
        <summary className="flex cursor-pointer items-center gap-3 text-sm">
          <span className="font-medium">{m.name}</span>
          <span className="font-semibold tabular-nums">{money(m.priceCents)}</span>
          <span className="text-ink-500">{m.minPax}–{m.maxPax} pers.</span>
          {m.freeEvery && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Gift className="size-3" />1 ogni {m.freeEvery}</span>}
          {!m.active && <Badge tone="gray">Non attivo</Badge>}
        </summary>
      )}
      <ActionForm action={saveMenuAction} hidden={{ orgId: r.id, ...(m ? { id: m.id } : {}) }} className="mt-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-6">
          <Field label="Nome" className="sm:col-span-2"><input name="name" defaultValue={m?.name} required className="input" /></Field>
          <Field label="€ a persona"><input name="price" defaultValue={m ? (m.priceCents / 100).toFixed(2) : ""} required className="input" /></Field>
          <Field label="Min pers."><input type="number" name="minPax" defaultValue={m?.minPax ?? 10} className="input" /></Field>
          <Field label="Max pers."><input type="number" name="maxPax" defaultValue={m?.maxPax ?? 100} className="input" /></Field>
          <Field label="1 gratuità ogni"><input type="number" name="freeEvery" defaultValue={m?.freeEvery ?? ""} placeholder="—" className="input" /></Field>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Portate (una per riga)">
            <textarea name="courses" rows={5} defaultValue={courses.map((c) => `${c.course}: ${c.items.join(", ")}`).join("\n")} className="input font-mono text-xs" />
          </Field>
          <div className="space-y-2">
            <Field label="Adatto a"><input name="audience" defaultValue={m?.audience ?? ""} placeholder="Studenti, Adulti…" className="input" /></Field>
            <Field label="Descrizione"><input name="description" defaultValue={m?.description ?? ""} className="input" /></Field>
            <div>
              <span className="label">Disponibile nei servizi</span>
              <div className="flex flex-wrap gap-2">
                {r.services.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2 py-1 text-xs">
                    <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={linked.has(s.id)} className="accent-brand-500" />
                    {s.kind} · {s.room.name}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={m?.active ?? true} className="accent-brand-500" /> Prenotabile</label>
          </div>
        </div>
      </ActionForm>
    </details>
  );
}

async function Payments({ r, isAdmin, basePath }: { r: R; isAdmin: boolean; basePath: string }) {
  const agents = isAdmin ? await db.user.findMany({ where: { role: "AGENT", status: "ACTIVE" }, orderBy: { name: "asc" } }) : [];
  const enabled = stripeEnabled();
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Incassi online con Stripe" subtitle="Il cliente paga ForGroups, il ristorante riceve l'importo al netto della provvigione direttamente sul proprio conto." />
        <div className="space-y-4 p-5">
          <div className={`flex items-start gap-3 rounded-xl p-4 ${r.stripeTransfersActive ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
            {r.stripeTransfersActive ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertTriangle className="size-5 shrink-0" />}
            <div className="text-sm">
              <div className="font-medium">{r.stripeTransfersActive ? "Pronto a ricevere pagamenti" : r.stripeAccountId ? "Registrazione Stripe da completare" : "Non ancora collegato"}</div>
              <div className="mt-0.5 opacity-80">
                {r.stripeTransfersActive
                  ? "I bonifici partono in automatico verso l'IBAN registrato su Stripe."
                  : "Servono pochi minuti: dati dell'attività, IBAN e un documento del legale rappresentante."}
                {r.stripeCheckedAt && ` Ultima verifica ${stamp(r.stripeCheckedAt)}.`}
              </div>
            </div>
          </div>
          {!enabled && <p className="text-xs text-ink-500">Stripe non è ancora configurato sul server (manca STRIPE_SECRET_KEY): i pulsanti si attiveranno dopo la configurazione.</p>}
          <div className="flex flex-wrap gap-2">
            <ActionButton run={stripeOnboardAction.bind(null, r.id, basePath + "?tab=pagamenti")} variant="primary">
              <CreditCard className="size-4" /> {r.stripeAccountId ? "Completa / aggiorna dati" : "Collega Stripe"}
            </ActionButton>
            {r.stripeAccountId && <ActionButton run={stripeRefreshAction.bind(null, r.id)}>Verifica stato</ActionButton>}
            {r.stripeAccountId && r.stripeTransfersActive && <ActionButton run={stripeDashboardAction.bind(null, r.id)}>Dashboard incassi</ActionButton>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Condizioni" />
        <div className="p-5">
          <ActionForm action={saveOrgAction} hidden={{ orgId: r.id, _flags: "1" }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Modalità di pagamento predefinita">
                <select name="defaultPaymentMode" defaultValue={r.defaultPaymentMode} className="input">
                  {Object.entries(PAYMENT_MODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Acconto (%)"><input type="number" name="defaultDepositPercent" defaultValue={r.defaultDepositPercent} className="input" /></Field>
              {isAdmin ? (
                <>
                  <Field label="Provvigione ForGroups (%)"><input name="commissionPct" defaultValue={r.commissionRate / 100} className="input" /></Field>
                  <Field label="Agente">
                    <select name="agentId" defaultValue={r.agentId ?? ""} className="input">
                      <option value="">— Nessuno —</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Data contratto"><input type="date" name="contractDate" defaultValue={r.contractDate ? isoDay(r.contractDate) : ""} className="input" /></Field>
                  <div className="flex flex-col justify-end gap-2 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={r.featured} className="accent-brand-500" /> In evidenza sul sito</label>
                    <label className="flex items-center gap-2"><input type="checkbox" name="acceptsOnlinePayment" defaultChecked={r.acceptsOnlinePayment} className="accent-brand-500" /> Accetta pagamenti online</label>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-ink-600">Provvigione ForGroups: <b>{pct(r.commissionRate)}</b></div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="acceptsOnlinePayment" defaultChecked={r.acceptsOnlinePayment} className="accent-brand-500" /> Accetta pagamenti online</label>
                </>
              )}
            </div>
            {isAdmin && <Field label="Note sul contratto"><textarea name="contractNotes" rows={2} defaultValue={r.contractNotes ?? ""} className="input" /></Field>}
          </ActionForm>
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader title="Dati di fatturazione" subtitle="Per le fatture delle provvigioni sulle prenotazioni pagate sul posto" />
        <div className="p-5">
          <ActionForm action={saveOrgAction} hidden={{ orgId: r.id }}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Ragione sociale"><input name="billingName" defaultValue={r.billingName ?? ""} className="input" /></Field>
              <Field label="Partita IVA"><input name="vatNumber" defaultValue={r.vatNumber ?? ""} className="input" /></Field>
              <Field label="Codice fiscale"><input name="fiscalCode" defaultValue={r.fiscalCode ?? ""} className="input" /></Field>
              <Field label="Codice SDI"><input name="sdiCode" defaultValue={r.sdiCode ?? ""} className="input" /></Field>
              <Field label="PEC"><input name="pec" defaultValue={r.pec ?? ""} className="input" /></Field>
              <Field label="IBAN"><input name="iban" defaultValue={r.iban ?? ""} className="input" /></Field>
            </div>
            {isAdmin && <Field label="Note interne"><textarea name="internalNotes" rows={2} defaultValue={r.internalNotes ?? ""} className="input" /></Field>}
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}
