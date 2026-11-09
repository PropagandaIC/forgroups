"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  Banknote, BriefcaseBusiness, Building2, CalendarDays, ChartColumn, Globe, Heart, Inbox, LayoutDashboard, LogOut, Menu,
  Settings, Store, Sun, Ticket, UserCog, UtensilsCrossed, Wallet, type LucideIcon,
} from "lucide-react";

const ICONS = {
  Banknote, BriefcaseBusiness, Building2, CalendarDays, ChartColumn, Heart, Inbox, LayoutDashboard, Settings, Store, Sun, Ticket, UserCog, UtensilsCrossed, Wallet,
} satisfies Record<string, LucideIcon>;
import { Logo } from "./ui";
import { PaletteTrigger } from "./command-palette";

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number; section?: string };

export function AppShell({
  nav,
  user,
  children,
  logout,
  showPalette = false,
  areaLabel,
}: {
  nav: NavItem[];
  user: { name: string; subtitle: string };
  children: React.ReactNode;
  logout: () => Promise<void>;
  showPalette?: boolean;
  areaLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = nav[0]?.href ?? "/";
  const isActive = (href: string) => (href === root ? pathname === href : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <Link href="/" className="flex items-baseline gap-2">
          <Logo dark />
        </Link>
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-300 uppercase">{areaLabel}</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {nav.map((item, i) => {
          const Icon = ICONS[item.icon];
          const showSection = item.section && item.section !== nav[i - 1]?.section;
          return (
            <div key={item.href}>
              {showSection && <div className="mt-5 mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-ink-500 uppercase">{item.section}</div>}
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive(item.href) ? "bg-white/10 text-white" : "text-ink-400 hover:bg-white/5 hover:text-ink-100",
                )}
              >
                <Icon className={clsx("size-4", isActive(item.href) ? "text-brand-400" : "text-ink-500 group-hover:text-ink-300")} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-brand-400 px-1.5 py-0.5 text-[10px] leading-none font-bold text-ink-950">{item.badge}</span>
                ) : null}
              </Link>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-400 text-xs font-bold text-ink-950">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{user.name}</div>
            <div className="truncate text-xs text-ink-400">{user.subtitle}</div>
          </div>
          <form action={logout}>
            <button title="Esci" className="rounded-md p-1.5 text-ink-400 hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink-950 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink-950">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-ink-200/70 bg-ink-50/85 px-4 backdrop-blur sm:px-6 lg:px-8">
        <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-ink-600 hover:bg-ink-100 lg:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </button>
        {showPalette && <PaletteTrigger className="w-full max-w-sm" />}
        <div className="ml-auto flex items-center gap-2">
          <Link href="/ristoranti" className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-100 sm:flex">
            <Globe className="size-4" /> Sito
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
