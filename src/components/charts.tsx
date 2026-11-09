import Link from "next/link";

/** Valori in centesimi → asse compatto (12K, 1,2M) */
function compact(v: number) {
  return new Intl.NumberFormat("it-IT", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/**
 * Istogramma a serie singola: colonne ≤24px con estremità arrotondata, griglia sottile,
 * tooltip su hover/focus, etichetta solo sull'ultima colonna. Tabella accessibile inclusa.
 */
export function ColumnChart({
  data,
  format,
  height = 200,
  label,
}: {
  data: { label: string; value: number; sub?: string }[];
  format: (v: number) => string;
  height?: number;
  label: string;
}) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  return (
    <figure aria-label={label}>
      <div className="flex gap-3">
        <div className="relative w-10 shrink-0 text-right text-[11px] text-ink-400 tabular-nums" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%`, transform: "translateY(50%)" }}>
              {compact(t / 100)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0" style={{ height }}>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-ink-100" style={{ bottom: `${(t / max) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex items-end justify-between gap-[2px]" style={{ height }}>
            {data.map((d, i) => {
              const h = (d.value / max) * 100;
              const last = i === data.length - 1;
              return (
                <div key={d.label} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none">
                  <div
                    className={`w-full max-w-6 rounded-t-[4px] transition ${last ? "bg-ink-900" : "bg-brand-600 group-hover:bg-brand-700"}`}
                    style={{ height: `${Math.max(h, d.value > 0 ? 1 : 0)}%` }}
                  />
                  {last && d.value > 0 && (
                    <span className="absolute -translate-y-full pb-1 text-[11px] font-semibold whitespace-nowrap text-ink-900" style={{ bottom: `${h}%` }}>
                      {format(d.value)}
                    </span>
                  )}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-ink-950 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg group-hover:block group-focus:block">
                    <div className="font-semibold">{format(d.value)}</div>
                    <div className="text-ink-300">{d.label}{d.sub ? ` · ${d.sub}` : ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between gap-[2px] text-[11px] text-ink-400">
            {data.map((d) => (
              <span key={d.label} className="flex-1 text-center">{d.label.slice(0, 3)}</span>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}><th>{d.label}</th><td>{format(d.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Classifica a barre orizzontali sottili, valore in testo neutro accanto alla barra. */
export function RankBars({ items }: { items: { label: string; value: number; display: string; hint?: string; href?: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-ink-800">{it.label}</span>
              <span className="shrink-0 text-ink-900 tabular-nums">{it.display}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-ink-100">
                <div className="h-2 rounded-full bg-brand-600" style={{ width: `${(it.value / max) * 100}%` }} />
              </div>
              {it.hint && <span className="w-20 shrink-0 text-right text-[11px] text-ink-500">{it.hint}</span>}
            </div>
          </>
        );
        return <li key={it.label}>{it.href ? <Link href={it.href} className="block rounded-lg hover:bg-ink-50">{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

/** Scala sequenziale ambra (chiaro → scuro) per l'occupazione */
export function heatColor(ratio: number) {
  if (ratio <= 0) return "var(--color-ink-100)";
  const steps = ["#fff1c6", "#ffe188", "#ffcc4a", "#f59a07", "#d97302", "#b44f06"];
  return steps[Math.min(steps.length - 1, Math.floor(ratio * steps.length))]!;
}
