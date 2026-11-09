"use client";

import { useActionState, useState, useTransition } from "react";
import type { InquiryStage } from "@prisma/client";
import { Check, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { addOptionAction, assignAction, inquiryNoteAction, removeOptionAction, setStageAction, updateInquiryAction } from "@/app/actions/inquiry";
import { buttonClass } from "./ui";
import { INQUIRY_STAGE } from "@/lib/labels";

export function StageSelect({ id, stage }: { id: string; stage: InquiryStage }) {
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-1 gap-1">
      {(Object.keys(INQUIRY_STAGE) as InquiryStage[]).map((s) => (
        <button
          key={s}
          disabled={pending}
          onClick={() => {
            const reason = s === "LOST" ? window.prompt("Perché è persa?") ?? undefined : undefined;
            if (s === "LOST" && reason === undefined) return;
            start(() => setStageAction(id, s, reason));
          }}
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${s === stage ? "bg-ink-900 text-white" : "hover:bg-ink-100"}`}
        >
          <span>{INQUIRY_STAGE[s].label}</span>
          <span className={`text-xs ${s === stage ? "text-ink-300" : "text-ink-400"}`}>{INQUIRY_STAGE[s].hint}</span>
        </button>
      ))}
    </div>
  );
}

export function AssignSelect({ id, value, staff }: { id: string; value: string | null; staff: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <select
      disabled={pending}
      defaultValue={value ?? ""}
      onChange={(e) => start(() => assignAction(id, e.target.value || null))}
      className="input"
    >
      <option value="">Non assegnata</option>
      {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}

export function AddOptionButton({ inquiryId, restaurantId, menuId, priceCents, note }: { inquiryId: string; restaurantId: string; menuId: string | null; priceCents: number; note?: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      disabled={pending || done}
      onClick={() => start(async () => { await addOptionAction(inquiryId, restaurantId, menuId, priceCents, note); setDone(true); })}
      className={buttonClass(done ? "ghost" : "secondary", "sm")}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : done ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      {done ? "Aggiunto" : "Proponi"}
    </button>
  );
}

export function RemoveOptionButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => removeOptionAction(id))} className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" title="Rimuovi">
      <Trash2 className="size-4" />
    </button>
  );
}

export function CopyBox({ text, label = "Copia testo" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <textarea readOnly value={text} rows={Math.min(16, text.split("\n").length + 1)} className="input font-mono text-xs" />
      <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={buttonClass("dark", "sm")}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copiato" : label}
      </button>
    </div>
  );
}

export function NoteForm({ inquiryId }: { inquiryId: string }) {
  const [state, action, pending] = useActionState(inquiryNoteAction, undefined);
  return (
    <form action={action} key={state?.ok ?? "f"} className="space-y-2">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <textarea name="body" rows={2} placeholder="Nota: chiamato il cliente, preferisce zona Vaticano…" className="input" />
      <button disabled={pending} className={buttonClass("secondary", "sm")}>{pending && <Loader2 className="size-3.5 animate-spin" />} Aggiungi nota</button>
    </form>
  );
}

export function InquiryEditForm({ children, inquiryId }: { children: React.ReactNode; inquiryId: string }) {
  const [state, action, pending] = useActionState(updateInquiryAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      {children}
      <div className="flex items-center gap-3">
        <button disabled={pending} className={buttonClass("dark", "sm")}>{pending && <Loader2 className="size-3.5 animate-spin" />} Salva</button>
        {state?.ok && <span className="text-xs text-emerald-700">{state.ok}</span>}
      </div>
    </form>
  );
}
