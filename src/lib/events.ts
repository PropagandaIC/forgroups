import { db } from "./db";

export async function logEvent(e: {
  entityType: "booking" | "inquiry" | "organization" | "payment" | "user";
  entityId: string;
  action: string;
  summary: string;
  userId?: string | null;
  data?: unknown;
}) {
  await db.event.create({
    data: {
      entityType: e.entityType,
      entityId: e.entityId,
      action: e.action,
      summary: e.summary,
      userId: e.userId ?? null,
      data: e.data === undefined ? null : JSON.stringify(e.data),
    },
  });
}
