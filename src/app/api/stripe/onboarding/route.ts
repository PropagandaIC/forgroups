import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { onboardingLink } from "@/lib/stripe";

/** refresh_url dell'onboarding: rigenera un link valido (solo per utenti autorizzati). */
export async function GET(req: NextRequest) {
  const user = await getUser();
  const orgId = req.nextUrl.searchParams.get("org") ?? "";
  const back = req.nextUrl.searchParams.get("back") ?? "/";
  if (!user || (user.role !== "ADMIN" && user.organizationId !== orgId)) return NextResponse.redirect(new URL("/accedi", req.url));
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) return new NextResponse("Non trovato", { status: 404 });
  const safeBack = back.startsWith("/") && !back.startsWith("//") ? back : "/";
  return NextResponse.redirect(await onboardingLink(org, safeBack));
}
