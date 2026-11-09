"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDays, Check, Gift, Loader2, Users } from "lucide-react";
import { createBookingAction, slotsAction } from "@/app/actions/booking";
import type { SlotAvailability } from "@/lib/availability";
import { GROUP_TYPES } from "@/lib/labels";

type MenuLite = { id: string; name: string; priceCents: number; minPax: number; maxPax: number; freeEvery: number | null; serviceIds: string[] };

const eur = (c: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(c / 100);

export function BookingWidget({
  restaurantId,
  menus,
  defaults,
  paymentNote,
  organizers,
  inquiryId,
}: {
  restaurantId: string;
  menus: MenuLite[];
  defaults: { date?: string; pax?: number; contactName?: string; contactPhone?: string; organizerId?: string; groupType?: string };
  paymentNote: string;
  organizers?: { id: string; name: string }[]; // solo staff
  inquiryId?: string;
}) {
  const [state, action, pending] = useActionState(createBookingAction, undefined);
  const [date, setDate] = useState(defaults.date ?? "");
  const [pax, setPax] = useState(defaults.pax ?? 20);
  const [slots, setSlots] = useState<SlotAvailability[] | null>(null);
  const [picked, setPicked] = useState("");
  const [menuId, setMenuId] = useState("");
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    if (!date) return;
    startLoading(async () => {
      const s = await slotsAction(restaurantId, date);
      setSlots(s);
    });
  }, [date, restaurantId]);

  // Servizio scelto dall'utente; se non ha posti sufficienti, il primo che li ha
  const serviceId = useMemo(() => {
    if (!slots) return "";
    const fits = (x: SlotAvailability) => x.open && x.free >= pax;
    const current = slots.find((x) => x.serviceId === picked);
    if (current && (fits(current) || organizers)) return picked;
    return slots.find(fits)?.serviceId ?? (current ? picked : (slots.find((x) => x.open)?.serviceId ?? ""));
  }, [slots, pax, picked, organizers]);

  const slot = slots?.find((s) => s.serviceId === serviceId);
  const availableMenus = useMemo(
    () => menus.filter((m) => (!serviceId || m.serviceIds.length === 0 || m.serviceIds.includes(serviceId))),
    [menus, serviceId],
  );
  const menu = availableMenus.find((m) => m.id === menuId) ?? null;
  const free = menu?.freeEvery ? Math.floor(pax / (menu.freeEvery + 1)) : 0;
  const total = menu ? (pax - free) * menu.priceCents : 0;
  const paxError = menu && (pax < menu.minPax || pax > menu.maxPax) ? `Questo menu è per ${menu.minPax}–${menu.maxPax} persone` : null;
  const capacityError = slot && slot.free < pax ? `Restano ${slot.free} posti` : null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="menuId" value={menu?.id ?? ""} />
      {inquiryId && <input type="hidden" name="inquiryId" value={inquiryId} />}

      {organizers && (
        <label className="block">
          <span className="label">Per conto di (agenzia)</span>
          <select name="organizerId" className="input" defaultValue={defaults.organizerId ?? ""}>
            <option value="">— Cliente diretto —</option>
            {organizers.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label flex items-center gap-1"><CalendarDays className="size-3.5" /> Data</span>
          <input type="date" name="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label flex items-center gap-1"><Users className="size-3.5" /> Persone</span>
          <input type="number" name="pax" min={1} required value={pax} onChange={(e) => setPax(Number(e.target.value))} className="input" />
        </label>
      </div>

      <div>
        <span className="label">Servizio</span>
        {!date ? (
          <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-500">Scegli una data per vedere la disponibilità.</p>
        ) : loading && !slots ? (
          <p className="flex items-center gap-2 text-sm text-ink-500"><Loader2 className="size-4 animate-spin" /> Verifico la disponibilità…</p>
        ) : slots && slots.length === 0 ? (
          <p className="text-sm text-ink-500">Nessun servizio configurato.</p>
        ) : (
          <div className="grid gap-2">
            {slots?.map((s) => {
              const enough = s.free >= pax;
              const disabled = !organizers && (!s.open || !enough);
              return (
                <button
                  type="button"
                  key={s.serviceId}
                  disabled={disabled}
                  onClick={() => setPicked(s.serviceId)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    serviceId === s.serviceId ? "border-brand-400 bg-brand-50 ring-4 ring-brand-100" : "border-ink-200 hover:border-ink-300"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span>
                    <span className="font-medium">{s.kind}</span>{" "}
                    <span className="text-ink-500">· {s.startTime}–{s.endTime} · {s.roomName}</span>
                  </span>
                  <span className={`text-xs font-medium ${s.open && enough ? "text-emerald-700" : "text-ink-500"}`}>
                    {!s.open ? s.reason : enough ? `${s.free} posti liberi` : `solo ${s.free} posti`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {slot && (
        <label className="block">
          <span className="label">Orario di arrivo</span>
          <input type="time" name="time" required defaultValue={slot.startTime} min={slot.startTime} max={slot.endTime} className="input" />
        </label>
      )}

      <div>
        <span className="label">Menu</span>
        <div className="grid gap-2">
          {availableMenus.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => setMenuId(m.id)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                menuId === m.id ? "border-brand-400 bg-brand-50 ring-4 ring-brand-100" : "border-ink-200 hover:border-ink-300"
              }`}
            >
              <span>
                <span className="font-medium">{m.name}</span>
                <span className="block text-xs text-ink-500">
                  {m.minPax}–{m.maxPax} pers.{m.freeEvery ? ` · 1 gratuità ogni ${m.freeEvery}` : ""}
                </span>
              </span>
              <span className="font-semibold tabular-nums">{eur(m.priceCents)}</span>
            </button>
          ))}
        </div>
      </div>

      <details className="group rounded-xl border border-ink-200 p-3" open>
        <summary className="cursor-pointer text-sm font-medium">Dati del gruppo</summary>
        <div className="mt-3 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input name="groupName" placeholder="Nome gruppo / riferimento" className="input" />
            <select name="groupType" className="input" defaultValue={defaults.groupType ?? ""}>
              <option value="">Tipo di gruppo</option>
              {GROUP_TYPES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input name="contactName" required placeholder="Referente" defaultValue={defaults.contactName} className="input" />
            <input name="contactPhone" placeholder="Telefono referente" defaultValue={defaults.contactPhone} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input name="groupLeader" placeholder="Capogruppo / guida sul posto" className="input" />
            <input name="groupLeaderPhone" placeholder="Cellulare capogruppo" className="input" />
          </div>
          <input name="dietaryNotes" placeholder="Allergie, celiaci, vegetariani…" className="input" />
          <textarea name="notes" rows={2} placeholder="Note per il ristorante" className="input" />
        </div>
      </details>

      {menu && (
        <div className="rounded-xl bg-ink-950 p-4 text-sm text-white">
          <div className="flex justify-between text-ink-300">
            <span>{pax - free} paganti × {eur(menu.priceCents)}</span>
            <span>{eur(total)}</span>
          </div>
          {free > 0 && (
            <div className="mt-1 flex items-center justify-between text-emerald-300">
              <span className="flex items-center gap-1"><Gift className="size-3.5" /> {free} gratuità</span>
              <span>incluse</span>
            </div>
          )}
          <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
            <span className="text-ink-300">Totale</span>
            <span className="text-2xl font-semibold tabular-nums">{eur(total)}</span>
          </div>
          <p className="mt-2 text-xs text-ink-400">{paymentNote}</p>
        </div>
      )}

      {(paxError || capacityError) && <p className="text-sm text-red-600">{paxError ?? capacityError}</p>}
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <button
        disabled={pending || !menu || !serviceId || (!organizers && (!!paxError || !!capacityError))}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-400 text-sm font-semibold text-ink-950 transition hover:bg-brand-300 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Invia prenotazione
      </button>
      <p className="text-center text-xs text-ink-500">Il ristorante conferma di solito entro 24 ore. Paghi solo dopo la conferma.</p>
    </form>
  );
}
