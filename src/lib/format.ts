const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const eur0 = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("it-IT");

export const money = (cents: number | null | undefined) => eur.format((cents ?? 0) / 100);
export const money0 = (cents: number | null | undefined) => eur0.format((cents ?? 0) / 100);
export const n = (v: number | null | undefined) => num.format(v ?? 0);
export const pct = (bps: number) => `${(bps / 100).toLocaleString("it-IT", { maximumFractionDigits: 2 })}%`;

const dFmt = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const dLong = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dtFmt = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/** Date di servizio: salvate a mezzanotte UTC, mostrate senza fuso. */
export const day = (d: Date | null | undefined) => (d ? dFmt.format(d) : "—");
export const dayLong = (d: Date | null | undefined) => (d ? dLong.format(d) : "—");
/** Timestamp reali (creazione, pagamenti) mostrati in ora italiana. */
export const stamp = (d: Date | null | undefined) => (d ? dtFmt.format(d) : "—");

export function relative(d: Date) {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "adesso";
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h fa`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} g fa`;
  return day(d);
}

/** "2026-12-24" → Date a mezzanotte UTC */
export function parseDay(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T00:00:00.000Z`);
}
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const todayUTC = () => parseDay(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }))!;
export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
