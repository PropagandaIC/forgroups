import { AppShell, type NavItem } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function RistoratoreLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["RESTAURANT"]);
  const toConfirm = await db.booking.count({ where: { restaurantId: user.organizationId ?? "-", status: "REQUESTED" } });
  const nav: NavItem[] = [
    { href: "/ristoratore", label: "Oggi", icon: "Sun" },
    { href: "/ristoratore/prenotazioni", label: "Prenotazioni", icon: "Ticket", badge: toConfirm },
    { href: "/ristoratore/locale", label: "Il mio locale", icon: "Store" },
    { href: "/ristoratore/profilo", label: "Account", icon: "Settings" },
  ];
  return (
    <AppShell nav={nav} user={{ name: user.name, subtitle: user.organization?.name ?? "" }} logout={logoutAction} areaLabel="Ristorante">
      {children}
    </AppShell>
  );
}
