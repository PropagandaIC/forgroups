import { Search, CalendarDays, Users, MapPin, UtensilsCrossed } from "lucide-react";
import { SERVICE_KINDS } from "@/lib/labels";

export function SearchBar({
  cities,
  defaults = {},
  compact = false,
}: {
  cities: { name: string; slug: string }[];
  defaults?: { citta?: string; data?: string; persone?: string; servizio?: string };
  compact?: boolean;
}) {
  const cell = "flex min-w-0 flex-1 items-center gap-2 px-4 py-2.5";
  const control = "w-full min-w-0 bg-transparent text-sm font-medium text-ink-900 outline-none placeholder:text-ink-400";
  return (
    <form
      action="/ristoranti"
      className={`flex flex-col divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-pop)] md:flex-row md:items-stretch md:divide-x md:divide-y-0 ${compact ? "" : "md:rounded-full"}`}
    >
      <label className={cell}>
        <MapPin className="size-4 shrink-0 text-brand-500" />
        <span className="w-full">
          <span className="block text-[11px] font-medium text-ink-500">Città</span>
          <select name="citta" defaultValue={defaults.citta ?? ""} className={control}>
            <option value="">Tutte le città</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className={cell}>
        <CalendarDays className="size-4 shrink-0 text-brand-500" />
        <span className="w-full">
          <span className="block text-[11px] font-medium text-ink-500">Data</span>
          <input type="date" name="data" defaultValue={defaults.data} className={control} />
        </span>
      </label>
      <label className={cell}>
        <Users className="size-4 shrink-0 text-brand-500" />
        <span className="w-full">
          <span className="block text-[11px] font-medium text-ink-500">Persone</span>
          <input type="number" name="persone" min={1} placeholder="es. 35" defaultValue={defaults.persone} className={control} />
        </span>
      </label>
      <label className={cell}>
        <UtensilsCrossed className="size-4 shrink-0 text-brand-500" />
        <span className="w-full">
          <span className="block text-[11px] font-medium text-ink-500">Servizio</span>
          <select name="servizio" defaultValue={defaults.servizio ?? ""} className={control}>
            <option value="">Qualsiasi</option>
            {SERVICE_KINDS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </span>
      </label>
      <div className="p-2">
        <button className="flex h-full w-full items-center justify-center gap-2 rounded-xl bg-brand-400 px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-brand-300 md:rounded-full">
          <Search className="size-4" /> Cerca
        </button>
      </div>
    </form>
  );
}
