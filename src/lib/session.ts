import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "fg_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 giorni

export type SessionPayload = { uid: string; role: string };

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET mancante o troppo corto (min 32 caratteri)");
  return new TextEncoder().encode(secret);
}

export async function signSession(p: SessionPayload) {
  return new SignJWT(p)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.uid !== "string" || typeof payload.role !== "string") return null;
    return { uid: payload.uid, role: payload.role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};
