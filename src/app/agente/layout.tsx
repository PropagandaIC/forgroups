import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["AGENT"]);
  return (
    <AppShell nav={[{ href: "/agente", label: "I miei ristoranti", icon: "BriefcaseBusiness" }]} user={{ name: user.name, subtitle: "Agente" }} logout={logoutAction} areaLabel="Agente">
      {children}
    </AppShell>
  );
}
