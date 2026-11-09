"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle, Loader2, Sparkles, Wand2 } from "lucide-react";
import { aiExtractAction, createInquiryAdminAction } from "@/app/actions/inquiry";
import type { ExtractedInquiry } from "@/lib/ai";
import { GROUP_TYPES, SERVICE_KINDS } from "@/lib/labels";
import { buttonClass } from "./ui";

export function AiInquiry({ aiReady, manual }: { aiReady: boolean; manual: boolean }) {
  const [text, setText] = useState("");
  const [data, setData] = useState<ExtractedInquiry | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [analyzing, start] = useTransition();
  const [state, action, saving] = useActionState(createInquiryAdminAction, undefined);
  const showForm = manual || data !== null;
  const v = (k: keyof ExtractedInquiry) => {
    const x = data?.[k];
    return x === 0 || x === undefined ? "" : String(x);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-violet-600" /> Incolla l&apos;email del cliente</h2>
        <p className="mt-1 text-sm text-ink-500">Funziona in qualsiasi lingua. L&apos;AI estrae data, persone, città, budget ed esigenze e prepara una bozza di risposta.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder={"Es.: Hello, we are a group of 38 students from Dublin visiting Rome on 14th March, looking for a pizza lunch near the Vatican, budget around €18 per person, 2 coeliacs…"}
          className="input mt-4 font-mono text-xs"
        />
        {!aiReady && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="size-4 shrink-0" /> AI non ancora attiva: aggiungi la chiave ANTHROPIC_API_KEY nelle impostazioni del server. Nel frattempo puoi compilare a mano.
          </p>
        )}
        {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button
            disabled={!aiReady || analyzing || text.trim().length < 20}
            onClick={() =>
              start(async () => {
                setErr(null);
                const r = await aiExtractAction(text);
                if (r.error) setErr(r.error);
                else setData(r.data!);
              })
            }
            className={buttonClass("dark", "md")}
          >
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Analizza con AI
          </button>
          {!showForm && <button onClick={() => setData({} as ExtractedInquiry)} className={buttonClass("secondary", "md")}>Compila a mano</button>}
        </div>
      </div>

      {showForm && (
        <form action={action} key={JSON.stringify(data)} className="card space-y-3 p-5">
          <h2 className="font-semibold">Dati della richiesta {data?.summary ? <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">compilati dall&apos;AI, verifica</span> : null}</h2>
          {data?.summary && <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-900">{data.summary}</p>}
          {data?.missing?.length ? <p className="text-xs text-amber-800">Da chiedere al cliente: {data.missing.join(", ")}</p> : null}
          <input type="hidden" name="source" value={data?.summary ? "ai" : "email"} />
          <input type="hidden" name="message" value={text} />
          <input type="hidden" name="aiSummary" value={data?.summary ?? ""} />
          <input type="hidden" name="replyDraft" value={data?.replyDraft ?? ""} />
          <input type="hidden" name="dietary" value={data?.dietary ?? ""} />
          <input type="hidden" name="language" value={data?.language ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <label><span className="label">Nome contatto *</span><input name="contactName" defaultValue={v("contactName")} required className="input" /></label>
            <label><span className="label">Agenzia / ente</span><input name="company" defaultValue={v("company")} className="input" /></label>
            <label><span className="label">Email</span><input name="email" defaultValue={v("email")} className="input" /></label>
            <label><span className="label">Telefono</span><input name="phone" defaultValue={v("phone")} className="input" /></label>
            <label><span className="label">Città</span><input name="city" defaultValue={v("city")} className="input" /></label>
            <label><span className="label">Data</span><input type="date" name="date" defaultValue={v("date")} className="input" /></label>
            <label><span className="label">Orario</span><input type="time" name="time" defaultValue={v("time")} className="input" /></label>
            <label><span className="label">Persone</span><input type="number" name="pax" defaultValue={v("pax")} className="input" /></label>
            <label><span className="label">Tipo gruppo</span>
              <select name="groupType" defaultValue={v("groupType")} className="input"><option value="">—</option>{GROUP_TYPES.map((g) => <option key={g}>{g}</option>)}</select>
            </label>
            <label><span className="label">Servizio</span>
              <select name="serviceKind" defaultValue={v("serviceKind")} className="input"><option value="">—</option>{SERVICE_KINDS.map((g) => <option key={g}>{g}</option>)}</select>
            </label>
            <label><span className="label">Budget € a persona</span><input type="number" name="budget" defaultValue={v("budgetPerPersonEur")} className="input" /></label>
          </div>
          {data?.replyDraft && (
            <details className="rounded-lg border border-ink-200 p-3 text-sm">
              <summary className="cursor-pointer font-medium">Bozza di risposta suggerita</summary>
              <p className="mt-2 whitespace-pre-line text-ink-700">{data.replyDraft}</p>
            </details>
          )}
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button disabled={saving} className={buttonClass("primary", "md")}>{saving && <Loader2 className="size-4 animate-spin" />} Crea richiesta e cerca ristoranti</button>
        </form>
      )}
    </div>
  );
}
