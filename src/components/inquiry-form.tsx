"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { createInquiryAction } from "@/app/actions/booking";
import { GROUP_TYPES, SERVICE_KINDS } from "@/lib/labels";

export function InquiryForm({
  restaurantId,
  defaults = {},
  compact = false,
}: {
  restaurantId?: string;
  defaults?: { contactName?: string; email?: string; phone?: string; company?: string; city?: string };
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(createInquiryAction, undefined);
  if (state?.ok)
    return (
      <div className="flex flex-col items-center rounded-xl bg-emerald-50 p-6 text-center text-emerald-800">
        <CheckCircle2 className="size-8" />
        <p className="mt-2 font-medium">{state.ok}</p>
      </div>
    );
  return (
    <form action={action} className="grid gap-3">
      {restaurantId && <input type="hidden" name="restaurantId" value={restaurantId} />}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="contactName" required placeholder="Nome e cognome *" defaultValue={defaults.contactName} className="input" />
        <input name="company" placeholder="Agenzia / scuola / ente" defaultValue={defaults.company} className="input" />
        <input name="email" type="email" required placeholder="Email *" defaultValue={defaults.email} className="input" />
        <input name="phone" placeholder="Telefono" defaultValue={defaults.phone} className="input" />
      </div>
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="city" placeholder="Città" defaultValue={defaults.city} className="input" />
          <input name="date" type="date" className="input" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {compact && <input name="date" type="date" className="input" />}
        <input name="pax" type="number" min={1} placeholder="N. persone" className="input" />
        <select name="groupType" className="input" defaultValue="">
          <option value="">Tipo di gruppo</option>
          {GROUP_TYPES.map((g) => <option key={g}>{g}</option>)}
        </select>
        {!compact && (
          <select name="serviceKind" className="input" defaultValue="">
            <option value="">Servizio</option>
            {SERVICE_KINDS.map((g) => <option key={g}>{g}</option>)}
          </select>
        )}
      </div>
      {!compact && <input name="budget" type="number" min={0} step="1" placeholder="Budget a persona (€)" className="input" />}
      <textarea name="message" required rows={compact ? 3 : 5} placeholder="Raccontaci il gruppo: età, esigenze, orari, preferenze…" className="input" />
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ink-900 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:opacity-50">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Invia richiesta
      </button>
    </form>
  );
}
