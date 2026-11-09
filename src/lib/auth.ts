import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "./session";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 11);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export const getUser = cache(async () => {
  const jar = await cookies();
  const s = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const user = await db.user.findUnique({
    where: { id: s.uid },
    include: { organization: true },
  });
  if (!user || user.status === "DISABLED") return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export async function startSession(userId: string, role: Role) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession({ uid: userId, role }), sessionCookieOptions);
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Da usare in ogni pagina e server action protetta: l'autorizzazione si verifica qui, non solo nel proxy. */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) redirect("/accedi");
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export const requireAdmin = () => requireUser(["ADMIN"]);

export function homeFor(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "RESTAURANT":
      return "/ristoratore";
    case "AGENT":
      return "/agente";
    default:
      return "/area";
  }
}
