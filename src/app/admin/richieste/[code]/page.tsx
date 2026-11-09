import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, ChevronLeft, Lock, Mail, MapPin, Phone, Sparkles, Users, Wallet } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { availabilityFor } from "@/lib/availability";
import { Badge, Card, CardHeader, Field, LinkButton } from "@/components/ui";
import { AddOptionButton, AssignSelect, CopyBox, InquiryEditForm, NoteForm, RemoveOptionButton, StageSelect } from "@/components/inquiry-client";
import { day, dayLong, isoDay, money, money0, slugify, stamp } from "@/lib/format";
import { GROUP_TYPES, INQUIRY_STAGE, SERVICE_KINDS } from "@/lib/labels";

export default async function Richiesta({ params }: { params: Promise<{ code: string }> }) {
  await requireAdmin();
  const { code } = await params;
  const q = await db.inquiry.findUnique({
    where: { code },
    include: {
      organizer: true,
      assignee: true,
      booking: true,
      quoteOptions: { include: { restaurant: true, menu: true }, orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "desc" }, include: { author: true } },
    },
  });
  if (!q) notFound();
  const [staff, events] = await Promise.all([
    db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.event.findMany({ where: { entityType: "inquiry", entityId: q.id }, orderBy: { createdAt: "desc" }, include: { user: true } }),
  ]);

  // ── Suggerimenti: ristoranti della città con posto e menu nel budget
  const where: Prisma.OrganizationWhereInput = { kind: "RESTAURANT", status: "ACTIVE" };
  if (q.city) where.citySlug = slugify(q.city);
  if (q.pax) where.maxCapacity = { gte: q.pax };
  const candidates = await db.organization.findMany({
    where,
    include: { menus: { where: { active: true }, orderBy: { priceCents: "asc" } } },
    take: 30,
  });
  const already = new Set(q.quoteOptions.map((o) => o.restaurantId));
  const suggestions = (
    await Promise.all(
      candidates.map(async (r) => {
        const menus = r.menus.filter(
          (m) => (!q.pax || (m.minPax <= q.pax && m.maxPax >= q.pax)) && (!q.budgetCents || m.priceCents <= q.budgetCents * 1.1),
        );
        if (!menus.length) return null;
        let availability: string | null = null;
        let ok = true;
        if (q.date) {
          const slots = (await availabilityFor(r.id, q.date)).filter((s) => !q.serviceKind || s.kind === q.serviceKind);
          const good = slots.filter((s) => s.open && s.free >= (q.pax ?? 1));
          ok = good.length > 0;
          availability = ok ? `${good.map((s) => `${s.kind} ${s.roomName} (${s.free} posti)`).slice(0, 2).join(", ")}` : "Non disponibile";
        }
        return { r, menus, availability, ok, score: (ok ? 100 : 0) + (r.featured ? 10 : 0) - menus[0]!.priceCents / 1000 };
      }),
    )
  )
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // ── Testo del preventivo pronto da inviare
  const en = q.language && q.language !== "it";
  const quoteText = q.quoteOptions.length
    ? [
        en ? `Dear ${q.contactName},` : `Gentile ${q.contactName},`,
        "",
        en
          ? `thank you for your request${q.date ? ` for ${day(q.date)}` : ""}${q.pax ? ` (${q.pax} guests)` : ""}. Here are our proposals:`
          : `grazie per la richiesta${q.date ? ` per il ${day(q.date)}` : ""}${q.pax ? ` (${q.pax} persone)` : ""}. Ecco le nostre proposte:`,
        "",
        ...q.quoteOptions.flatMap((o, i) => [
          `${i + 1}. ${o.restaurant.name} – ${o.restaurant.city}`,
          `   ${o.menu?.name ?? "Menu dedicato"}: ${money(o.priceCents)} ${en ? "per person" : "a persona"}${o.menu?.freeEvery ? (en ? ` · 1 free place every ${o.menu.freeEvery}` : ` · 1 gratuità ogni ${o.menu.freeEvery}`) : ""}`,
          ...(o.note ? [`   ${o.note}`] : []),
          `   ${process.env.APP_URL ?? "https://www.forgroups.it"}/ristoranti/${o.restaurant.slug}`,
          "",
        ]),
        en ? "Reply to this email to confirm and we will secure the booking for you." : "Rispondi a questa email per confermare: blocchiamo noi il tavolo per il tuo gruppo.",
        "",
        en ? "Kind regards," : "Un caro saluto,",
        "Il team ForGroups",
      ].join("\n")
    : "";

  const st = INQUIRY_STAGE[q.stage];

  return (
    <>
      <Link href="/admin/richieste" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
        <ChevronLeft className="size-4" /> Pipeline
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{q.contactName}</h1>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {q.code} · {q.company ?? "privato"} · arrivata {stamp(q.createdAt)} da {q.source}
          </p>
        </div>
        {q.booking ? (
          <LinkButton href={`/admin/prenotazioni/${q.booking.code}`} variant="dark">Vai alla prenotazione {q.booking.code} <ArrowRight className="size-4" /></LinkButton>
        ) : (
          <LinkButton href={`/admin/prenotazioni/nuova?inquiry=${q.id}${q.quoteOptions[0] ? `&ristorante=${q.quoteOptions.find((o) => o.chosen)?.restaurantId ?? q.quoteOptions[0].restaurantId}` : ""}`} variant="primary">
            Converti in prenotazione <ArrowRight className="size-4" />
          </LinkButton>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <div className="grid gap-px overflow-hidden rounded-t-2xl bg-ink-100 sm:grid-cols-4">
              {[
                [MapPin, "Città", q.city ?? "—"],
                [CalendarDays, "Data", q.date ? `${dayLong(q.date)}${q.time ? ` · ${q.time}` : ""}` : "—"],
                [Users, "Persone", q.pax ? `${q.pax}${q.groupType ? ` · ${q.groupType}` : ""}` : "—"],
                [Wallet, "Budget", q.budgetCents ? `${money0(q.budgetCents)} a persona` : "—"],
              ].map(([Icon, l, v], i) => {
                const I = Icon as typeof MapPin;
                return (
                  <div key={i} className="bg-white p-4">
                    <div className="flex items-center gap-1.5 text-xs text-ink-500"><I className="size-3.5" /> {l as string}</div>
                    <div className="mt-1 text-sm font-medium first-letter:uppercase">{v as string}</div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-4 p-5">
              {q.aiSummary && (
                <div className="flex gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
                  <Sparkles className="mt-0.5 size-4 shrink-0" /> {q.aiSummary}
                </div>
              )}
              {q.message && <blockquote className="border-l-2 border-brand-300 pl-4 text-sm whitespace-pre-line text-ink-700">{q.message}</blockquote>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Proposta al cliente" subtitle={q.quoteOptions.length ? `${q.quoteOptions.length} opzioni selezionate` : "Aggiungi le opzioni dai suggerimenti qui sotto"} />
            {q.quoteOptions.length > 0 && (
              <ul className="divide-y divide-ink-100">
                {q.quoteOptions.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{o.restaurant.name}</div>
                      <div className="text-xs text-ink-500">{o.menu?.name ?? "Menu dedicato"} · {money(o.priceCents)} p.p.{o.note ? ` · ${o.note}` : ""}</div>
                    </div>
                    <LinkButton size="sm" href={`/admin/prenotazioni/nuova?inquiry=${q.id}&ristorante=${o.restaurantId}`}>Prenota questo</LinkButton>
                    <RemoveOptionButton id={o.id} />
                  </li>
                ))}
              </ul>
            )}
            {quoteText && (
              <div className="border-t border-ink-100 p-5">
                <div className="mb-2 text-xs font-medium text-ink-500">Testo pronto da inviare {en ? "(in inglese)" : ""}</div>
                <CopyBox text={quoteText} label="Copia preventivo" />
                {q.email && (
                  <a
                    href={`mailto:${q.email}?subject=${encodeURIComponent(`ForGroups – proposta ${q.code}`)}&body=${encodeURIComponent(quoteText)}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
                  >
                    <Mail className="size-4" /> Apri nel programma di posta
                  </a>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Ristoranti suggeriti"
              subtitle={`${q.city ?? "Tutte le città"}${q.pax ? ` · almeno ${q.pax} posti` : ""}${q.budgetCents ? ` · entro ${money0(q.budgetCents)}` : ""}${q.date ? " · disponibilità verificata sulla data" : ""}`}
            />
            {suggestions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-500">Nessun ristorante soddisfa tutti i criteri. Prova a modificare budget o persone nei dettagli.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {suggestions.map(({ r, menus, availability, ok }) => (
                  <li key={r.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/ristoranti/${r.id}`} className="text-sm font-medium hover:underline">{r.name}</Link>
                        <div className="text-xs text-ink-500">{r.cuisine} · max {r.maxCapacity}{already.has(r.id) ? " · già proposto" : ""}</div>
                      </div>
                      {availability && <Badge tone={ok ? "green" : "gray"}>{availability}</Badge>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {menus.slice(0, 3).map((m) => (
                        <div key={m.id} className="flex items-center gap-2 rounded-lg border border-ink-200 py-1 pr-1 pl-3 text-xs">
                          <span>{m.name} · <b>{money(m.priceCents)}</b></span>
                          <AddOptionButton inquiryId={q.id} restaurantId={r.id} menuId={m.id} priceCents={m.priceCents} />
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Fase" />
            <div className="space-y-4 p-4">
              <StageSelect id={q.id} stage={q.stage} />
              {q.lostReason && <p className="text-sm text-ink-500">Motivo: {q.lostReason}</p>}
              <Field label="Assegnata a"><AssignSelect id={q.id} value={q.assigneeId} staff={staff} /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Contatto" />
            <div className="space-y-2 px-5 py-4 text-sm">
              {q.organizer && <Link href={`/admin/organizzatori/${q.organizer.id}`} className="block font-medium hover:underline">{q.organizer.name}</Link>}
              {q.email && <a href={`mailto:${q.email}`} className="flex items-center gap-2 text-ink-700 hover:underline"><Mail className="size-4 text-ink-400" />{q.email}</a>}
              {q.phone && <a href={`tel:${q.phone}`} className="flex items-center gap-2 text-ink-700 hover:underline"><Phone className="size-4 text-ink-400" />{q.phone}</a>}
              {q.phone && (
                <a href={`https://wa.me/${q.phone.replace(/\D/g, "")}`} target="_blank" className="inline-flex text-xs font-medium text-emerald-700 hover:underline">Scrivi su WhatsApp →</a>
              )}
              {q.language && <div className="text-ink-500">Lingua: {q.language.toUpperCase()}</div>}
            </div>
            <details className="border-t border-ink-100">
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Modifica dettagli</summary>
              <div className="px-5 pb-5">
                <InquiryEditForm inquiryId={q.id}>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Nome"><input name="contactName" defaultValue={q.contactName} className="input" /></Field>
                    <Field label="Azienda"><input name="company" defaultValue={q.company ?? ""} className="input" /></Field>
                    <Field label="Email"><input name="email" defaultValue={q.email ?? ""} className="input" /></Field>
                    <Field label="Telefono"><input name="phone" defaultValue={q.phone ?? ""} className="input" /></Field>
                    <Field label="Città"><input name="city" defaultValue={q.city ?? ""} className="input" /></Field>
                    <Field label="Data"><input type="date" name="date" defaultValue={q.date ? isoDay(q.date) : ""} className="input" /></Field>
                    <Field label="Persone"><input name="pax" type="number" defaultValue={q.pax ?? ""} className="input" /></Field>
                    <Field label="Budget €/pers."><input name="budget" defaultValue={q.budgetCents ? q.budgetCents / 100 : ""} className="input" /></Field>
                    <Field label="Tipo gruppo">
                      <select name="groupType" defaultValue={q.groupType ?? ""} className="input"><option value="">—</option>{GROUP_TYPES.map((g) => <option key={g}>{g}</option>)}</select>
                    </Field>
                    <Field label="Servizio">
                      <select name="serviceKind" defaultValue={q.serviceKind ?? ""} className="input"><option value="">—</option>{SERVICE_KINDS.map((g) => <option key={g}>{g}</option>)}</select>
                    </Field>
                  </div>
                </InquiryEditForm>
              </div>
            </details>
          </Card>

          <Card>
            <CardHeader title="Note e storico" subtitle="Visibili solo allo staff" />
            <div className="space-y-4 p-5">
              <NoteForm inquiryId={q.id} />
              <ul className="space-y-3">
                {[
                  ...q.messages.map((m) => ({ id: m.id, at: m.createdAt, who: m.author?.name ?? "Sistema", text: m.body, note: true })),
                  ...events.map((e) => ({ id: e.id, at: e.createdAt, who: e.user?.name ?? "Sistema", text: e.summary, note: false })),
                ]
                  .sort((a, b) => b.at.getTime() - a.at.getTime())
                  .map((x) => (
                    <li key={x.id} className={`text-sm ${x.note ? "rounded-lg bg-amber-50 p-2.5" : ""}`}>
                      <div className="text-xs text-ink-500">{x.note && <Lock className="mr-1 inline size-3" />}{x.who} · {stamp(x.at)}</div>
                      <div className="whitespace-pre-line text-ink-800">{x.text}</div>
                    </li>
                  ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
