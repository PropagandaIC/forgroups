"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InquiryStage } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { nextCode } from "@/lib/codes";
import { INQUIRY_STAGE } from "@/lib/labels";
import { parseDay, todayUTC, isoDay } from "@/lib/format";
import { aiEnabled, extractInquiry, type ExtractedInquiry } from "@/lib/ai";
import type { FormState } from "./auth";

const refresh = (code?: string) => {
  revalidatePath("/admin/richieste");
  if (code) revalidatePath(`/admin/richieste/${code}`);
  revalidatePath("/admin");
};

export async function setStageAction(inquiryId: string, stage: InquiryStage, lostReason?: string) {
  const user = await requireAdmin();
  const inq = await db.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
  if (inq.stage === stage) return;
  await db.inquiry.update({
    where: { id: inquiryId },
    data: { stage, lostReason: stage === "LOST" ? lostReason ?? inq.lostReason : null, assigneeId: inq.assigneeId ?? (stage !== "NEW" ? user.id : null) },
  });
  await logEvent({ entityType: "inquiry", entityId: inquiryId, action: "stage", userId: user.id, summary: `${INQUIRY_STAGE[inq.stage].label} → ${INQUIRY_STAGE[stage].label}${lostReason ? ` (${lostReason})` : ""}` });
  refresh(inq.code);
}

export async function assignAction(inquiryId: string, userId: string | null) {
  const user = await requireAdmin();
  const inq = await db.inquiry.update({ where: { id: inquiryId }, data: { assigneeId: userId, stage: undefined } });
  const who = userId ? (await db.user.findUnique({ where: { id: userId } }))?.name : "nessuno";
  await logEvent({ entityType: "inquiry", entityId: inquiryId, action: "assigned", userId: user.id, summary: `Assegnata a ${who}` });
  if (userId && inq.stage === "NEW") await setStageAction(inquiryId, "QUALIFIED");
  refresh(inq.code);
}

export async function inquiryNoteAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const inquiryId = String(form.get("inquiryId"));
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "Scrivi qualcosa" };
  const inq = await db.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
  const m = await db.message.create({ data: { inquiryId, authorId: user.id, body, internal: true } });
  refresh(inq.code);
  return { ok: m.id }; // id univoco: azzera il form dopo il salvataggio
}

export async function addOptionAction(inquiryId: string, restaurantId: string, menuId: string | null, priceCents: number, note?: string) {
  await requireAdmin();
  const inq = await db.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });
  await db.quoteOption.create({ data: { inquiryId, restaurantId, menuId, priceCents, note } });
  refresh(inq.code);
}

export async function removeOptionAction(optionId: string) {
  await requireAdmin();
  const o = await db.quoteOption.delete({ where: { id: optionId }, include: { inquiry: true } });
  refresh(o.inquiry.code);
}

export async function updateInquiryAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(form.get("inquiryId"));
  const s = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  const inq = await db.inquiry.update({
    where: { id },
    data: {
      contactName: s("contactName") ?? undefined,
      company: s("company"),
      email: s("email"),
      phone: s("phone"),
      city: s("city"),
      date: parseDay(s("date")),
      time: s("time"),
      pax: s("pax") ? Number(s("pax")) : null,
      groupType: s("groupType"),
      serviceKind: s("serviceKind"),
      budgetCents: s("budget") ? Math.round(Number(s("budget")!.replace(",", ".")) * 100) : null,
    },
  });
  refresh(inq.code);
  return { ok: "Salvato" };
}

/** Analisi AI dell'email incollata */
export async function aiExtractAction(text: string): Promise<{ data?: ExtractedInquiry; error?: string }> {
  await requireAdmin();
  if (!aiEnabled()) return { error: "AI non configurata: aggiungi ANTHROPIC_API_KEY nelle variabili d'ambiente." };
  if (text.trim().length < 20) return { error: "Incolla il testo completo dell'email." };
  try {
    return { data: await extractInquiry(text.slice(0, 30000), isoDay(todayUTC())) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function createInquiryAdminAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const s = (k: string) => String(form.get(k) ?? "").trim() || null;
  if (!s("contactName")) return { error: "Indica almeno il nome del contatto" };
  const code = await nextCode("inquiry");
  const org = s("company") ? await db.organization.findFirst({ where: { kind: "ORGANIZER", name: { equals: s("company")!, mode: "insensitive" } } }) : null;
  const inq = await db.inquiry.create({
    data: {
      code,
      source: s("source") ?? "email",
      contactName: s("contactName")!,
      company: s("company"),
      organizerId: org?.id,
      email: s("email"),
      phone: s("phone"),
      language: s("language"),
      city: s("city"),
      date: parseDay(s("date")),
      time: s("time"),
      pax: s("pax") ? Number(s("pax")) : null,
      groupType: s("groupType"),
      serviceKind: s("serviceKind"),
      budgetCents: s("budget") ? Math.round(Number(s("budget")) * 100) : null,
      message: s("message"),
      aiSummary: s("aiSummary"),
      assigneeId: user.id,
      stage: "QUALIFIED",
    },
  });
  if (s("dietary")) await db.message.create({ data: { inquiryId: inq.id, authorId: user.id, internal: true, body: `Esigenze alimentari: ${s("dietary")}` } });
  if (s("replyDraft")) await db.message.create({ data: { inquiryId: inq.id, authorId: user.id, internal: true, body: `Bozza di risposta suggerita:\n\n${s("replyDraft")}` } });
  await logEvent({ entityType: "inquiry", entityId: inq.id, action: "created", userId: user.id, summary: `Richiesta creata da ${s("source") === "ai" ? "email con AI" : "pannello"}` });
  refresh();
  redirect(`/admin/richieste/${code}`);
}
