"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, requireUser } from "@/lib/auth";
import { availabilityFor, type SlotAvailability } from "@/lib/availability";
import { computeBooking } from "@/lib/pricing";
import { nextCode } from "@/lib/codes";
import { logEvent } from "@/lib/events";
import { parseDay } from "@/lib/format";
import type { FormState } from "./auth";

export async function slotsAction(restaurantId: string, date: string): Promise<SlotAvailability[]> {
  const d = parseDay(date);
  if (!d) return [];
  return availabilityFor(restaurantId, d);
}

const NewBooking = z.object({
  restaurantId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Scegli la data"),
  serviceId: z.string().min(1, "Scegli il servizio"),
  menuId: z.string().min(1, "Scegli il menu"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Indica l'orario di arrivo"),
  pax: z.coerce.number().int().min(1, "Indica il numero di persone"),
  groupName: z.string().trim().optional(),
  groupType: z.string().trim().optional(),
  groupLeader: z.string().trim().optional(),
  groupLeaderPhone: z.string().trim().optional(),
  contactName: z.string().trim().min(2, "Indica il referente"),
  contactPhone: z.string().trim().optional(),
  dietaryNotes: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  organizerId: z.string().optional(), // solo staff: prenotazione per conto di un'agenzia
  inquiryId: z.string().optional(), // solo staff: conversione di una richiesta
});

/** Prenotazione dal portale (organizzatore) o dal pannello (staff). */
export async function createBookingAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(["ORGANIZER", "ADMIN"]);
  const parsed = NewBooking.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const date = parseDay(d.date)!;

  const restaurant = await db.organization.findFirst({ where: { id: d.restaurantId, kind: "RESTAURANT", status: "ACTIVE" } });
  if (!restaurant) return { error: "Ristorante non disponibile." };
  const menu = await db.menu.findFirst({
    where: { id: d.menuId, restaurantId: restaurant.id, active: true },
    include: { services: true },
  });
  if (!menu) return { error: "Menu non valido." };
  if (menu.services.length && !menu.services.some((s) => s.serviceId === d.serviceId)) return { error: "Questo menu non è disponibile per il servizio scelto." };
  if (d.pax < menu.minPax || d.pax > menu.maxPax) return { error: `Il menu ${menu.name} è prenotabile da ${menu.minPax} a ${menu.maxPax} persone.` };

  const slot = (await availabilityFor(restaurant.id, date)).find((s) => s.serviceId === d.serviceId);
  if (!slot) return { error: "Servizio non valido." };
  if (user.role !== "ADMIN") {
    if (!slot.open) return { error: slot.reason ?? "Servizio non disponibile in questa data." };
    if (slot.free < d.pax) return { error: `Restano ${slot.free} posti per questo servizio.` };
  }

  const organizerId = user.role === "ADMIN" ? d.organizerId || null : user.organizationId;
  const calc = computeBooking({ pax: d.pax, priceCents: menu.priceCents, freeEvery: menu.freeEvery, commissionRate: restaurant.commissionRate });
  const online = restaurant.acceptsOnlinePayment && restaurant.stripeTransfersActive;
  const paymentMode = online ? restaurant.defaultPaymentMode : "ON_SITE";

  const code = await nextCode("booking");
  const booking = await db.booking.create({
    data: {
      code,
      restaurantId: restaurant.id,
      organizerId,
      createdById: user.id,
      contactName: d.contactName,
      contactEmail: user.role === "ADMIN" ? null : user.email,
      contactPhone: d.contactPhone,
      groupName: d.groupName,
      groupType: d.groupType,
      groupLeader: d.groupLeader,
      groupLeaderPhone: d.groupLeaderPhone,
      date,
      time: d.time,
      serviceId: slot.serviceId,
      roomId: slot.roomId,
      menuId: menu.id,
      pax: d.pax,
      freePax: calc.freePax,
      dietaryNotes: d.dietaryNotes,
      notes: d.notes,
      priceCents: menu.priceCents,
      totalCents: calc.totalCents,
      commissionRate: restaurant.commissionRate,
      commissionCents: calc.commissionCents,
      paymentMode,
      depositPercent: paymentMode === "ONLINE_DEPOSIT" ? restaurant.defaultDepositPercent : null,
      source: user.role === "ADMIN" ? (d.inquiryId ? "inquiry" : "admin") : "platform",
      inquiryId: user.role === "ADMIN" && d.inquiryId ? d.inquiryId : null,
    },
  });
  if (user.role === "ADMIN" && d.inquiryId) {
    const inq = await db.inquiry.update({ where: { id: d.inquiryId }, data: { stage: "WON" } });
    await logEvent({ entityType: "inquiry", entityId: inq.id, action: "won", userId: user.id, summary: `Convertita nella prenotazione ${code}` });
  }
  await logEvent({
    entityType: "booking",
    entityId: booking.id,
    action: "created",
    userId: user.id,
    summary: `Prenotazione creata: ${d.pax} persone, ${menu.name}`,
  });
  revalidatePath("/admin");
  redirect(user.role === "ADMIN" ? `/admin/prenotazioni/${code}` : `/area/prenotazioni/${code}?nuova=1`);
}

const NewInquiry = z.object({
  contactName: z.string().trim().min(2, "Indica il tuo nome"),
  company: z.string().trim().optional(),
  email: z.email("Email non valida"),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  date: z.string().optional(),
  pax: z.coerce.number().int().min(0).optional(),
  groupType: z.string().optional(),
  serviceKind: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
  message: z.string().trim().min(5, "Scrivi qualche dettaglio sulla richiesta"),
  restaurantId: z.string().optional(),
  website: z.string().max(0).optional(), // honeypot anti-spam
});

/** Richiesta di preventivo/informazioni: dal sito pubblico o dal portale. */
export async function createInquiryAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = NewInquiry.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const user = await getUser();
  const code = await nextCode("inquiry");
  const restaurant = d.restaurantId ? await db.organization.findUnique({ where: { id: d.restaurantId } }) : null;
  const inquiry = await db.inquiry.create({
    data: {
      code,
      source: user ? "portal" : "website",
      organizerId: user?.role === "ORGANIZER" ? user.organizationId : null,
      contactName: d.contactName,
      company: d.company || user?.organization?.name,
      email: d.email,
      phone: d.phone,
      city: d.city || restaurant?.city,
      date: parseDay(d.date),
      pax: d.pax || null,
      groupType: d.groupType || null,
      serviceKind: d.serviceKind || null,
      budgetCents: d.budget ? Math.round(d.budget * 100) : null,
      message: d.message,
      restaurantId: restaurant?.id,
    },
  });
  await logEvent({
    entityType: "inquiry",
    entityId: inquiry.id,
    action: "created",
    userId: user?.id,
    summary: `Nuova richiesta${restaurant ? ` per ${restaurant.name}` : ""}`,
  });
  revalidatePath("/admin/richieste");
  return { ok: `Richiesta ${code} inviata! Ti rispondiamo entro poche ore lavorative.` };
}
