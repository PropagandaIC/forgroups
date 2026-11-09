import { db } from "./db";
import { monthRange } from "./commissions";

/** Per ogni agente: fatturato e provvigioni dei suoi ristoranti nel mese, e la sua quota. */
export async function agentStatement(period: string, agentId?: string) {
  const { from, to } = monthRange(period);
  const agents = await db.user.findMany({
    where: { role: "AGENT", ...(agentId ? { id: agentId } : {}) },
    include: { agentOf: { select: { id: true, name: true } }, agentPayouts: { where: { period } } },
    orderBy: { name: "asc" },
  });
  return Promise.all(
    agents.map(async (a) => {
      const agg = await db.booking.groupBy({
        by: ["restaurantId"],
        where: { restaurantId: { in: a.agentOf.map((r) => r.id) }, date: { gte: from, lt: to }, status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { totalCents: true, commissionCents: true },
        _count: true,
      });
      const revenue = agg.reduce((s, x) => s + (x._sum.totalCents ?? 0), 0);
      const commission = agg.reduce((s, x) => s + (x._sum.commissionCents ?? 0), 0);
      const share = a.agentShare ?? 2000;
      return {
        agent: a,
        restaurants: a.agentOf.length,
        perRestaurant: agg.map((x) => ({ name: a.agentOf.find((r) => r.id === x.restaurantId)?.name ?? "", total: x._sum.totalCents ?? 0, commission: x._sum.commissionCents ?? 0, count: x._count })),
        revenue,
        commission,
        share,
        due: Math.round((commission * share) / 10000),
        payout: a.agentPayouts[0] ?? null,
      };
    }),
  );
}
