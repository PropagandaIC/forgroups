"use client";

import { useActionState, useTransition, useState } from "react";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/app/actions/auth";
import { buttonClass } from "./ui";

/** Form generico collegato a una server action, con messaggio di esito. */
export function ActionForm({
  action,
  children,
  submit = "Salva",
  className,
  hidden,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
  hidden?: Record<string, string>;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className={className ?? "space-y-4"}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <div className="flex items-center gap-3">
        <button disabled={pending} className={buttonClass("dark", "md")}>
          {pending && <Loader2 className="size-4 animate-spin" />} {submit}
        </button>
        {state?.ok && <span className="text-sm text-emerald-700">{state.ok}</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

/** Pulsante che invoca una server action senza form (es. approva, attiva). */
export function ActionButton({
  run,
  children,
  variant = "secondary",
  size = "md",
  confirm,
}: {
  run: () => Promise<unknown>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "dark" | "danger" | "ghost";
  size?: "sm" | "md";
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start">
      <button
        disabled={pending}
        className={buttonClass(variant, size)}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setMsg(null);
          start(async () => {
            try {
              const r = (await run()) as { ok?: string; error?: string } | undefined;
              if (r?.ok || r?.error) setMsg(r.ok ?? r.error ?? null);
            } catch (e) {
              const m = (e as Error).message;
              if (m.includes("NEXT_REDIRECT")) throw e;
              setMsg(m);
            }
          });
        }}
      >
        {pending && <Loader2 className="size-4 animate-spin" />} {children}
      </button>
      {msg && <span className="mt-1 text-xs text-ink-600">{msg}</span>}
    </span>
  );
}
