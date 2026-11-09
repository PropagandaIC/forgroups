"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Role, Status } from "@prisma/client";
import { db } from "@/lib/db";
import { checkPassword, hashPassword, requireAdmin, requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import type { FormState } from "./auth";

const tempPassword = () => randomBytes(9).toString("base64url");

export async function createUserAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role")) as Role;
  const organizationId = String(form.get("organizationId") ?? "") || null;
  if (!email.includes("@") || name.length < 2) return { error: "Nome ed email sono obbligatori" };
  if (!["ADMIN", "AGENT", "ORGANIZER", "RESTAURANT"].includes(role)) return { error: "Ruolo non valido" };
  if ((role === "ORGANIZER" || role === "RESTAURANT") && !organizationId) return { error: "Scegli l'attività di appartenenza" };
  if (await db.user.findUnique({ where: { email } })) return { error: "Email già registrata" };
  const pw = tempPassword();
  const u = await db.user.create({
    data: { email, name, role, organizationId, phone: String(form.get("phone") ?? "") || null, passwordHash: await hashPassword(pw), status: "ACTIVE", agentShare: role === "AGENT" ? 2000 : null },
  });
  await logEvent({ entityType: "user", entityId: u.id, action: "created", userId: admin.id, summary: `Utente creato: ${name}` });
  revalidatePath("/admin/utenti");
  return { ok: `Utente creato. Password temporanea: ${pw} — comunicala in modo sicuro, potrà cambiarla dopo l'accesso.` };
}

export async function setUserStatusAction(userId: string, status: Status) {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("Non puoi disattivare te stesso");
  await db.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/admin/utenti");
}

export async function resetPasswordAction(userId: string) {
  const admin = await requireAdmin();
  const pw = tempPassword();
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(pw) } });
  await logEvent({ entityType: "user", entityId: userId, action: "password_reset", userId: admin.id, summary: "Password reimpostata" });
  return { ok: `Nuova password temporanea: ${pw}` };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "La nuova password deve avere almeno 8 caratteri" };
  if (!(await checkPassword(current, user.passwordHash))) return { error: "Password attuale non corretta" };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Password aggiornata" };
}
