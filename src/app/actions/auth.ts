"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkPassword, endSession, hashPassword, homeFor, startSession } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { logEvent } from "@/lib/events";
import type { OrganizerType } from "@prisma/client";
import { ORGANIZER_TYPES } from "@/lib/labels";

export type FormState = { error?: string; ok?: string } | undefined;

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  // stesso messaggio per email o password errata
  if (!user || !(await checkPassword(password, user.passwordHash))) return { error: "Email o password non corretti." };
  if (user.status === "DISABLED") return { error: "Account disattivato. Contatta ForGroups." };
  if (user.status === "PENDING")
    return { error: "Il tuo account è in attesa di approvazione. Ti scriveremo appena sarà attivo (di solito entro poche ore)." };
  await startSession(user.id, user.role);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

const Signup = z.object({
  kind: z.enum(["ORGANIZER", "RESTAURANT"]),
  organizerType: z.string().optional(),
  company: z.string().trim().min(2, "Inserisci il nome dell'attività"),
  city: z.string().trim().min(2, "Inserisci la città"),
  name: z.string().trim().min(2, "Inserisci nome e cognome"),
  email: z.email("Email non valida").transform((s) => s.toLowerCase()),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  vatNumber: z.string().trim().optional(),
});

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = Signup.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) return { error: "Esiste già un account con questa email." };
  const orgType = d.kind === "ORGANIZER" && d.organizerType && d.organizerType in ORGANIZER_TYPES ? (d.organizerType as OrganizerType) : null;

  let slug = slugify(`${d.company}-${d.city}`);
  if (await db.organization.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const org = await db.organization.create({
    data: {
      kind: d.kind,
      organizerType: orgType ?? (d.kind === "ORGANIZER" ? "AGENZIA" : null),
      name: d.company,
      slug,
      city: d.city,
      citySlug: slugify(d.city),
      email: d.email,
      phone: d.phone,
      vatNumber: d.vatNumber,
      status: "PENDING",
      members: {
        create: {
          email: d.email,
          name: d.name,
          phone: d.phone,
          passwordHash: await hashPassword(d.password),
          role: d.kind === "RESTAURANT" ? "RESTAURANT" : "ORGANIZER",
          status: "PENDING",
        },
      },
    },
  });
  await logEvent({ entityType: "organization", entityId: org.id, action: "signup", summary: `Nuova registrazione: ${d.company} (${d.city})` });
  return { ok: "Registrazione inviata! Verifichiamo i dati e attiviamo il tuo account, di solito entro poche ore lavorative." };
}
