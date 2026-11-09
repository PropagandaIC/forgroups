"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrganizerType, PaymentMode, Status } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { parseDay, slugify } from "@/lib/format";
import { expressDashboardLink, friendlyError, onboardingLink, refreshAccountStatus, stripeEnabled } from "@/lib/stripe";
import type { FormState } from "./auth";

async function guard(orgId: string): Promise<CurrentUser> {
  const user = await requireUser(["ADMIN", "RESTAURANT", "ORGANIZER"]);
  if (user.role !== "ADMIN" && user.organizationId !== orgId) throw new Error("Non autorizzato");
  return user;
}

const str = (form: FormData, k: string) => {
  const v = form.get(k);
  if (v === null) return undefined; // campo non presente nel form: non toccare
  const s = String(v).trim();
  return s === "" ? null : s;
};

function refresh(orgId: string) {
  revalidatePath(`/admin/ristoranti/${orgId}`);
  revalidatePath(`/admin/organizzatori/${orgId}`);
  revalidatePath("/ristoratore", "layout");
  revalidatePath("/area", "layout");
  revalidatePath("/ristoranti", "layout");
}

export async function saveOrgAction(_: FormState, form: FormData): Promise<FormState> {
  const orgId = String(form.get("orgId"));
  const user = await guard(orgId);
  const isAdmin = user.role === "ADMIN";
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const city = str(form, "city");
  const data: Record<string, unknown> = {
    name: str(form, "name") ?? undefined,
    email: str(form, "email"),
    phone: str(form, "phone"),
    website: str(form, "website"),
    address: str(form, "address"),
    zip: str(form, "zip"),
    city,
    citySlug: city === undefined ? undefined : city ? slugify(city) : null,
    province: str(form, "province"),
    billingName: str(form, "billingName"),
    vatNumber: str(form, "vatNumber"),
    fiscalCode: str(form, "fiscalCode"),
    sdiCode: str(form, "sdiCode"),
    pec: str(form, "pec"),
    iban: str(form, "iban"),
    tagline: str(form, "tagline"),
    description: str(form, "description"),
    descriptionEn: str(form, "descriptionEn"),
    cuisine: str(form, "cuisine"),
    tags: str(form, "tags"),
    openingHours: str(form, "openingHours"),
    coverImage: str(form, "coverImage"),
    maxCapacity: form.get("maxCapacity") ? Number(form.get("maxCapacity")) : undefined,
  };
  const imgs = str(form, "images");
  if (imgs !== undefined) data.images = imgs ? JSON.stringify(imgs.split(/\s+/).filter((u) => /^https?:\/\//.test(u))) : null;
  if (form.get("organizerType")) data.organizerType = form.get("organizerType") as OrganizerType;

  if (isAdmin) {
    if (form.get("commissionPct") !== null) data.commissionRate = Math.round(Number(String(form.get("commissionPct")).replace(",", ".")) * 100);
    if (form.get("agentId") !== null) data.agentId = str(form, "agentId");
    if (form.get("contractDate") !== null) data.contractDate = parseDay(str(form, "contractDate"));
    if (form.get("contractNotes") !== null) data.contractNotes = str(form, "contractNotes");
    if (form.get("internalNotes") !== null) data.internalNotes = str(form, "internalNotes");
    if (form.get("_flags")) {
      data.featured = form.get("featured") === "on";
      data.acceptsOnlinePayment = form.get("acceptsOnlinePayment") === "on";
    }
    if (form.get("defaultPaymentMode")) data.defaultPaymentMode = form.get("defaultPaymentMode") as PaymentMode;
    if (form.get("defaultDepositPercent")) data.defaultDepositPercent = Number(form.get("defaultDepositPercent"));
    const slug = str(form, "slug");
    if (slug && slug !== org.slug) {
      if (await db.organization.findFirst({ where: { slug: slugify(slug), NOT: { id: orgId } } })) return { error: "Indirizzo pagina già in uso" };
      data.slug = slugify(slug);
    }
  } else if (user.role === "RESTAURANT") {
    if (form.get("_flags")) data.acceptsOnlinePayment = form.get("acceptsOnlinePayment") === "on";
    if (form.get("defaultPaymentMode")) data.defaultPaymentMode = form.get("defaultPaymentMode") as PaymentMode;
    if (form.get("defaultDepositPercent")) data.defaultDepositPercent = Math.max(10, Number(form.get("defaultDepositPercent")));
  }
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
  await db.organization.update({ where: { id: orgId }, data });
  await logEvent({ entityType: "organization", entityId: orgId, action: "updated", userId: user.id, summary: "Scheda aggiornata" });
  refresh(orgId);
  return { ok: "Salvato" };
}

export async function setOrgStatusAction(orgId: string, status: Status) {
  const user = await requireUser(["ADMIN"]);
  const org = await db.organization.update({ where: { id: orgId }, data: { status } });
  if (status === "ACTIVE") await db.user.updateMany({ where: { organizationId: orgId, status: "PENDING" }, data: { status: "ACTIVE" } });
  if (status === "DISABLED") await db.user.updateMany({ where: { organizationId: orgId }, data: { status: "DISABLED" } });
  await logEvent({ entityType: "organization", entityId: orgId, action: "status", userId: user.id, summary: status === "ACTIVE" ? "Attivata" : status === "DISABLED" ? "Disattivata" : "In attesa" });
  refresh(org.id);
  revalidatePath("/admin");
}

// ───────────── Sale

export async function saveRoomAction(_: FormState, form: FormData): Promise<FormState> {
  const orgId = String(form.get("orgId"));
  await guard(orgId);
  const id = str(form, "id");
  const data = { name: String(form.get("name") || "Sala"), description: str(form, "description") ?? null, capacity: Math.max(1, Number(form.get("capacity")) || 1) };
  if (id) await db.room.update({ where: { id, restaurantId: orgId }, data });
  else await db.room.create({ data: { ...data, restaurantId: orgId } });
  const max = await db.room.aggregate({ where: { restaurantId: orgId }, _sum: { capacity: true } });
  await db.organization.update({ where: { id: orgId }, data: { maxCapacity: max._sum.capacity } });
  refresh(orgId);
  return { ok: "Sala salvata" };
}

export async function deleteRoomAction(orgId: string, id: string) {
  await guard(orgId);
  const used = await db.booking.count({ where: { roomId: id } });
  if (used) await db.serviceSlot.updateMany({ where: { roomId: id }, data: { active: false } });
  else await db.room.delete({ where: { id, restaurantId: orgId } });
  refresh(orgId);
}

// ───────────── Servizi (fasce orarie per sala)

export async function saveServiceAction(_: FormState, form: FormData): Promise<FormState> {
  const orgId = String(form.get("orgId"));
  await guard(orgId);
  const id = str(form, "id");
  const weekdays = ["1", "2", "3", "4", "5", "6", "7"].filter((d) => form.get(`wd${d}`) === "on").join("");
  if (!weekdays) return { error: "Seleziona almeno un giorno" };
  const data = {
    roomId: String(form.get("roomId")),
    kind: String(form.get("kind") || "Pranzo"),
    startTime: String(form.get("startTime") || "12:00"),
    endTime: String(form.get("endTime") || "15:00"),
    weekdays,
    validFrom: parseDay(str(form, "validFrom")),
    validTo: parseDay(str(form, "validTo")),
    leadTimeHours: Number(form.get("leadTimeHours") || 24),
    active: form.get("active") !== "off",
  };
  if (id) await db.serviceSlot.update({ where: { id, restaurantId: orgId }, data });
  else {
    const s = await db.serviceSlot.create({ data: { ...data, restaurantId: orgId } });
    // i menu esistenti diventano disponibili anche nel nuovo servizio
    const menus = await db.menu.findMany({ where: { restaurantId: orgId }, select: { id: true } });
    if (menus.length) await db.menuService.createMany({ data: menus.map((m) => ({ menuId: m.id, serviceId: s.id })) });
  }
  refresh(orgId);
  return { ok: "Servizio salvato" };
}

export async function toggleServiceAction(orgId: string, id: string, active: boolean) {
  await guard(orgId);
  await db.serviceSlot.update({ where: { id, restaurantId: orgId }, data: { active } });
  refresh(orgId);
}

// ───────────── Menu

/** Portate in formato testo: una riga per portata, "Primo: carbonara, amatriciana" */
function parseCourses(text: string | null | undefined) {
  if (!text) return null;
  const courses = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [course, rest] = l.includes(":") ? [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1)] : ["Menu", l];
      return { course: course.trim(), items: rest.split(/[,;]/).map((s) => s.trim()).filter(Boolean) };
    });
  return JSON.stringify(courses);
}

export async function saveMenuAction(_: FormState, form: FormData): Promise<FormState> {
  const orgId = String(form.get("orgId"));
  await guard(orgId);
  const id = str(form, "id");
  const price = Math.round(Number(String(form.get("price") || "0").replace(",", ".")) * 100);
  if (!price) return { error: "Indica il prezzo a persona" };
  const serviceIds = form.getAll("serviceIds").map(String);
  const data = {
    name: String(form.get("name") || "Menu"),
    description: str(form, "description") ?? null,
    courses: parseCourses(str(form, "courses")),
    priceCents: price,
    minPax: Number(form.get("minPax") || 1),
    maxPax: Number(form.get("maxPax") || 500),
    freeEvery: form.get("freeEvery") ? Number(form.get("freeEvery")) || null : null,
    audience: str(form, "audience") ?? null,
    active: form.get("active") === "on",
  };
  const menu = id
    ? await db.menu.update({ where: { id, restaurantId: orgId }, data })
    : await db.menu.create({ data: { ...data, restaurantId: orgId, position: await db.menu.count({ where: { restaurantId: orgId } }) } });
  await db.menuService.deleteMany({ where: { menuId: menu.id } });
  if (serviceIds.length) await db.menuService.createMany({ data: serviceIds.map((serviceId) => ({ menuId: menu.id, serviceId })) });
  refresh(orgId);
  return { ok: "Menu salvato" };
}

// ───────────── Stripe Connect

export async function stripeOnboardAction(orgId: string, returnPath: string) {
  await guard(orgId);
  if (!stripeEnabled()) return { error: "Stripe non è ancora configurato sul server." };
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (org.kind !== "RESTAURANT") return { error: "Solo i ristoranti ricevono pagamenti" };
  let url: string;
  try {
    url = await onboardingLink(org, returnPath);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  redirect(url);
}

export async function stripeRefreshAction(orgId: string) {
  await guard(orgId);
  if (!stripeEnabled()) return { error: "Stripe non configurato" };
  let r;
  try {
    r = await refreshAccountStatus(orgId);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  refresh(orgId);
  return { ok: r?.active ? "Incassi online attivi" : `Stato: ${r?.status ?? "account non creato"}` };
}

export async function stripeDashboardAction(orgId: string) {
  await guard(orgId);
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (!org.stripeAccountId) return { error: "Account Stripe non ancora creato" };
  let url: string;
  try {
    url = await expressDashboardLink(org.stripeAccountId);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  redirect(url);
}
