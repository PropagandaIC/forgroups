"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { ORGANIZER_TYPES } from "@/lib/labels";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="email" className="input" autoFocus />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50">
        {pending && <Loader2 className="size-4 animate-spin" />} Accedi
      </button>
      <p className="text-center text-sm text-ink-500">
        Non hai un account? <Link href="/registrati" className="font-medium text-brand-700 hover:underline">Registrati</Link>
      </p>
    </form>
  );
}

export function SignupForm({ initialKind }: { initialKind: "ORGANIZER" | "RESTAURANT" }) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  const [kind, setKind] = useState(initialKind);
  if (state?.ok)
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <p className="mt-3 font-medium text-ink-900">{state.ok}</p>
        <Link href="/ristoranti" className="mt-4 text-sm font-medium text-brand-700 hover:underline">Intanto sfoglia i ristoranti →</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-100 p-1 text-sm font-medium">
        {(
          [
            ["ORGANIZER", "Organizzo gruppi"],
            ["RESTAURANT", "Ho un ristorante"],
          ] as const
        ).map(([k, l]) => (
          <button
            type="button"
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg py-2 transition ${kind === k ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {kind === "ORGANIZER" && (
        <label className="block">
          <span className="label">Chi sei</span>
          <select name="organizerType" className="input" defaultValue="TOUR_OPERATOR">
            {Object.entries(ORGANIZER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">{kind === "RESTAURANT" ? "Nome del ristorante" : "Ragione sociale / ente"}</span>
          <input name="company" required className="input" />
        </label>
        <label className="block">
          <span className="label">Città</span>
          <input name="city" required className="input" />
        </label>
        <label className="block">
          <span className="label">Nome e cognome</span>
          <input name="name" required autoComplete="name" className="input" />
        </label>
        <label className="block">
          <span className="label">Telefono</span>
          <input name="phone" autoComplete="tel" className="input" />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" required autoComplete="email" className="input" />
        </label>
        <label className="block">
          <span className="label">Partita IVA (facoltativa)</span>
          <input name="vatNumber" className="input" />
        </label>
      </div>
      <label className="block">
        <span className="label">Password (min. 8 caratteri)</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </label>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-400 text-sm font-semibold text-ink-950 hover:bg-brand-300 disabled:opacity-50">
        {pending && <Loader2 className="size-4 animate-spin" />} Crea account
      </button>
      <p className="text-center text-xs text-ink-500">Verifichiamo ogni registrazione prima di attivarla.</p>
    </form>
  );
}
