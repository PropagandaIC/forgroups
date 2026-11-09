"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { agentStatement } from "@/lib/agents";
import { logEvent } from "@/lib/events";

export async function toggleAgentPaidAction(agentId: string, period: string) {
  const user = await requireAdmin();
  const [s] = await agentStatement(period, agentId);
  if (!s) throw new Error("Agente non trovato");
  const existing = await db.agentPayout.findUnique({ where: { agentId_period: { agentId, period } } });
  const paid = !existing?.paid;
  await db.agentPayout.upsert({
    where: { agentId_period: { agentId, period } },
    create: { agentId, period, revenueCents: s.revenue, amountCents: s.due, paid, paidAt: paid ? new Date() : null },
    update: { revenueCents: s.revenue, amountCents: s.due, paid, paidAt: paid ? new Date() : null },
  });
  await logEvent({ entityType: "user", entityId: agentId, action: "agent_payout", userId: user.id, summary: `Commissione ${period} ${paid ? "pagata" : "segnata come da pagare"} (${(s.due / 100).toFixed(2)} €)` });
  revalidatePath("/admin/agenti");
}

export async function setAgentShareAction(agentId: string, form: FormData) {
  await requireAdmin();
  const pct = Number(String(form.get("share")).replace(",", "."));
  if (Number.isNaN(pct) || pct < 0 || pct > 100) return;
  await db.user.update({ where: { id: agentId }, data: { agentShare: Math.round(pct * 100) } });
  revalidatePath("/admin/agenti");
}
