import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import type { Tone } from "@/lib/labels";

type Variant = "primary" | "dark" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-400 text-ink-950 hover:bg-brand-300 shadow-sm",
  dark: "bg-ink-900 text-white hover:bg-ink-800 shadow-sm",
  secondary: "bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 shadow-sm",
  ghost: "text-ink-700 hover:bg-ink-100",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return clsx(
    "inline-flex items-center justify-center rounded-lg font-medium transition whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  gray: "bg-ink-100 text-ink-600 ring-ink-500/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
};
const dots: Record<Tone, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-sky-500",
  gray: "bg-ink-400",
  violet: "bg-violet-500",
};

export function Badge({ tone = "gray", children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone])}>
      {dot && <span className={clsx("size-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

export function Card({ className, children, ...p }: ComponentProps<"div">) {
  return (
    <div className={clsx("card", className)} {...p}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-medium text-ink-500">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={clsx("card p-4", accent && "bg-ink-900 text-white border-ink-900")}>
      <div className={clsx("flex items-center justify-between text-xs font-medium", accent ? "text-ink-300" : "text-ink-500")}>
        {label}
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className={clsx("mt-1 text-xs", accent ? "text-ink-400" : "text-ink-500")}>{hint}</div>}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {icon && <div className="mb-3 rounded-full bg-ink-100 p-3 text-ink-500">{icon}</div>}
      <div className="text-sm font-medium text-ink-800">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-500">{children}</div>}
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const palette = ["bg-amber-100 text-amber-800", "bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800", "bg-violet-100 text-violet-800", "bg-rose-100 text-rose-800"];
  const i = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <span className={clsx("inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", palette[i], className)}>
      {ini || "?"}
    </span>
  );
}

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={clsx("inline-flex items-baseline font-display text-xl font-black tracking-tight", className)}>
      <span className="text-brand-400">for</span>
      <span className={dark ? "text-white" : "text-ink-950"}>groups</span>
      <span className="ml-0.5 size-1.5 rounded-full bg-brand-400" />
    </span>
  );
}

/** Copertina del ristorante: foto se presente, altrimenti un motivo grafico coerente generato dal nome. */
export function Cover({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={clsx("object-cover", className)} />;
  }
  const hues = [28, 12, 42, 200, 160, 340, 265];
  const h = hues[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % hues.length]!;
  return (
    <div
      className={clsx("relative flex items-end overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 90% at 85% 10%, hsl(${h} 85% 72% / .9), transparent 55%), radial-gradient(90% 80% at 10% 100%, hsl(${(h + 30) % 360} 70% 40%), transparent 60%), linear-gradient(135deg, hsl(${h} 35% 22%), hsl(${(h + 20) % 360} 30% 12%))`,
      }}
    >
      <span className="pointer-events-none absolute -right-3 -bottom-6 select-none font-display text-[7rem] leading-none font-black text-white/10">
        {name.replace(/^(ristorante|trattoria|osteria|hostaria|pizzeria)\s+/i, "").slice(0, 2)}
      </span>
    </div>
  );
}
