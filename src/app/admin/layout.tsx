import { AppShell, type NavItem } from "@/components/app-shell";
import { CommandPalette } from "@/components/command-palette";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [newInquiries, toConfirm, pendingOrgs] = await Promise.all([
    db.inquiry.count({ where: { stage: "NEW" } }),
    db.booking.count({ where: { status: "REQUESTED" } }),
    db.organization.count({ where: { status: "PENDING" } }),
  ]);
  const nav: NavItem[] = [
    { href: "/admin", label: "Oggi", icon: "Sun" },
    { href: "/admin/richieste", label: "Richieste", icon: "Inbox", badge: newInquiries },
    { href: "/admin/prenotazioni", label: "Prenotazioni", icon: "Ticket", badge: toConfirm },
    { href: "/admin/agenda", label: "Agenda", icon: "CalendarDays" },
    { href: "/admin/ristoranti", label: "Ristoranti", icon: "Store", section: "Rete" },
    { href: "/admin/organizzatori", label: "Agenzie e clienti", icon: "Building2", badge: pendingOrgs },
    { href: "/admin/pagamenti", label: "Incassi e provvigioni", icon: "Wallet", section: "Amministrazione" },
    { href: "/admin/agenti", label: "Agenti", icon: "BriefcaseBusiness" },
    { href: "/admin/statistiche", label: "Statistiche", icon: "ChartColumn" },
    { href: "/admin/utenti", label: "Utenti e accessi", icon: "UserCog", section: "Sistema" },
    { href: "/admin/impostazioni", label: "Impostazioni", icon: "Settings" },
  ];
  return (
    <AppShell nav={nav} user={{ name: user.name, subtitle: user.email }} logout={logoutAction} showPalette areaLabel="Staff">
      <CommandPalette />
      {children}
    </AppShell>
  );
}
