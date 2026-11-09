"use client";

import { useActionState, useState, useTransition } from "react";
import type { BookingStatus } from "@prisma/client";
import { Check, Copy, CreditCard, Link2, Loader2, Lock, Send, X } from "lucide-react";
import { addMessageAction, manualPaymentAction, payAction, paymentLinkAction, setStatusAction, updateBookingAction } from "@/app/actions/booking-manage";
import { buttonClass } from "./ui";

export function StatusButton({
  bookingId,
  to,
  label,
  variant = "secondary",
  askReason,
  confirm: confirmText,
}: {
  bookingId: string;
  to: BookingStatus;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "dark";
  askReason?: string;
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        disabled={pending}
        className={buttonClass(variant, "md")}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          const reason = askReason ? window.prompt(askReason) ?? undefined : undefined;
          if (askReason && reason === undefined) return;
          setErr(null);
          start(async () => {
            const r = await setStatusAction(bookingId, to, reason || undefined);
            if (r?.error) setErr(r.error);
          });
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : to === "CONFIRMED" ? <Check className="size-4" /> : to === "DECLINED" || to === "CANCELLED" ? <X className="size-4" /> : null}
        {label}
      </button>
      {err && <span className="mt-1 text-xs text-red-600">{err}</span>}
    </span>
  );
}

export function PayButton({ bookingId, returnPath, label }: { bookingId: string; returnPath: string; label: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        disabled={pending}
        className={buttonClass("primary", "lg")}
        onClick={() =>
          start(async () => {
            const r = await payAction(bookingId, returnPath);
            if (r?.error) setErr(r.error);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />} {label}
      </button>
      {err && <span className="mt-1 text-xs text-red-600">{err}</span>}
    </span>
  );
}

export function PaymentLinkButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ url?: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <button disabled={pending} className={buttonClass("secondary", "sm", "w-full")} onClick={() => start(async () => setRes(await paymentLinkAction(bookingId)))}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />} Crea link di pagamento
      </button>
      {res?.error && <p className="text-xs text-red-600">{res.error}</p>}
      {res?.url && (
        <div className="flex gap-1">
          <input readOnly value={res.url} className="input h-8 text-xs" onFocus={(e) => e.target.select()} />
          <button
            className={buttonClass("dark", "sm")}
            onClick={() => {
              navigator.clipboard.writeText(res.url!);
              setCopied(true);
            }}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

export function MessageComposer({ bookingId, canInternal }: { bookingId: string; canInternal: boolean }) {
  const [state, action, pending] = useActionState(addMessageAction, undefined);
  const [internal, setInternal] = useState(false);
  return (
    <form
      action={async (fd) => {
        await action(fd);
        (document.getElementById(`msg-${bookingId}`) as HTMLTextAreaElement | null)?.form?.reset();
      }}
      className={`rounded-xl border p-2 ${internal ? "border-amber-300 bg-amber-50" : "border-ink-200 bg-white"}`}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <textarea
        id={`msg-${bookingId}`}
        name="body"
        rows={2}
        placeholder={internal ? "Nota interna, visibile solo allo staff ForGroups…" : "Scrivi un messaggio (lo vedono cliente, ristorante e staff)…"}
        className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-1">
        {canInternal ? (
          <label className="flex items-center gap-1.5 text-xs text-ink-600">
            <input type="checkbox" name="internal" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-amber-500" />
            <Lock className="size-3" /> Nota interna
          </label>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
          <button disabled={pending} className={buttonClass("dark", "sm")}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Invia
          </button>
        </div>
      </div>
    </form>
  );
}

export function EditBookingForm({ children, bookingId }: { children: React.ReactNode; bookingId: string }) {
  const [state, action, pending] = useActionState(updateBookingAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      {children}
      <div className="flex items-center gap-3">
        <button disabled={pending} className={buttonClass("dark", "md")}>
          {pending && <Loader2 className="size-4 animate-spin" />} Salva modifiche
        </button>
        {state?.ok && <span className="text-sm text-emerald-700">{state.ok}</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export function ManualPaymentForm({ bookingId, due }: { bookingId: string; due: number }) {
  const [state, action, pending] = useActionState(manualPaymentAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="flex gap-2">
        <input name="amount" defaultValue={(due / 100).toFixed(2)} className="input h-8 text-xs" />
        <select name="method" className="input h-8 w-auto text-xs">
          <option value="bonifico">Bonifico</option>
          <option value="contanti">Contanti</option>
          <option value="pos">POS</option>
        </select>
      </div>
      <button disabled={pending} className={buttonClass("secondary", "sm", "w-full")}>
        {pending && <Loader2 className="size-3.5 animate-spin" />} Registra incasso manuale
      </button>
      {state?.ok && <p className="text-xs text-emerald-700">{state.ok}</p>}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
