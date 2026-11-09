import { AppShell, type NavItem } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["ORGANIZER"]);
  const toPay = await db.booking.count({
    where: { organizerId: user.organizationId ?? "-", status: "CONFIRMED", paymentStatus: { in: ["UNPAID"] }, paymentMode: { in: ["ONLINE_FULL", "ONLINE_DEPOSIT"] } },
  });
  const nav: NavItem[] = [
    { href: "/area", label: "Home", icon: "LayoutDashboard" },
    { href: "/ristoranti", label: "Cerca e prenota", icon: "UtensilsCrossed" },
    { href: "/area/prenotazioni", label: "Le mie prenotazioni", icon: "Ticket", badge: toPay },
    { href: "/area/richieste", label: "Preventivi", icon: "Inbox" },
    { href: "/area/profilo", label: "Profilo e team", icon: "Settings" },
  ];
  return (
    <AppShell nav={nav} user={{ name: user.name, subtitle: user.organization?.name ?? "" }} logout={logoutAction} areaLabel="Agenzia">
      {children}
    </AppShell>
  );
}
