"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type SearchHit = { type: "booking" | "restaurant" | "organizer" | "inquiry"; title: string; subtitle: string; href: string };

/** Ricerca globale per la palette ⌘K */
export async function searchAll(q: string): Promise<SearchHit[]> {
  await requireUser(["ADMIN"]);
  const s = q.trim();
  if (s.length < 2) return [];
  const ci = { contains: s, mode: "insensitive" as const };
  const [bookings, orgs, inquiries] = await Promise.all([
    db.booking.findMany({
      where: { OR: [{ code: ci }, { contactName: ci }, { groupName: ci }, { contactEmail: ci }, { organizer: { name: ci } }] },
      include: { restaurant: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 6,
    }),
    db.organization.findMany({
      where: { OR: [{ name: ci }, { city: ci }, { email: ci }, { vatNumber: ci }] },
      orderBy: { name: "asc" },
      take: 8,
    }),
    db.inquiry.findMany({
      where: { OR: [{ code: ci }, { contactName: ci }, { company: ci }, { email: ci }] },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);
  return [
    ...bookings.map((b) => ({
      type: "booking" as const,
      title: `${b.code} · ${b.groupName ?? b.contactName}`,
      subtitle: `${b.restaurant.name} · ${b.date.toISOString().slice(0, 10)} · ${b.pax} pers.`,
      href: `/admin/prenotazioni/${b.code}`,
    })),
    ...orgs.map((o) => ({
      type: o.kind === "RESTAURANT" ? ("restaurant" as const) : ("organizer" as const),
      title: o.name,
      subtitle: `${o.kind === "RESTAURANT" ? "Ristorante" : "Organizzatore"} · ${o.city ?? ""}`,
      href: o.kind === "RESTAURANT" ? `/admin/ristoranti/${o.id}` : `/admin/organizzatori/${o.id}`,
    })),
    ...inquiries.map((i) => ({
      type: "inquiry" as const,
      title: `${i.code} · ${i.contactName}`,
      subtitle: `Richiesta · ${i.city ?? ""} · ${i.pax ?? "?"} pers.`,
      href: `/admin/richieste/${i.code}`,
    })),
  ];
}
