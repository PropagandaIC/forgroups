import type { Role } from "@prisma/client";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ActionButton, ActionForm } from "@/components/action-form";
import { Badge, Card, CardHeader, Field, PageHeader } from "@/components/ui";
import { createUserAction, resetPasswordAction, setUserStatusAction } from "@/app/actions/users";
import { relative } from "@/lib/format";
import { ROLES } from "@/lib/labels";

export default async function Utenti({ searchParams }: { searchParams: Promise<{ q?: string; ruolo?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const [users, orgs] = await Promise.all([
    db.user.findMany({
      where: {
        ...(sp.ruolo ? { role: sp.ruolo as Role } : {}),
        ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }] } : {}),
      },
      include: { organization: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 300,
    }),
    db.organization.findMany({ where: { status: { not: "DISABLED" } }, select: { id: true, name: true, kind: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Utenti e accessi" subtitle="Staff, agenti, ristoratori e organizzatori che possono entrare nella piattaforma" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <form className="mb-4 flex flex-wrap gap-2">
            <label className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-ink-400" />
              <input name="q" defaultValue={sp.q} placeholder="Nome o email…" className="input pl-9" />
            </label>
            <select name="ruolo" defaultValue={sp.ruolo ?? ""} className="input w-auto">
              <option value="">Tutti i ruoli</option>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="h-9 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white">Filtra</button>
          </form>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-ink-100">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{u.name} {u.id === me.id && <span className="text-xs text-ink-400">(tu)</span>}</div>
                    <div className="truncate text-xs text-ink-500">{u.email}{u.organization ? ` · ${u.organization.name}` : ""} · ultimo accesso {u.lastLoginAt ? relative(u.lastLoginAt) : "mai"}</div>
                  </div>
                  <Badge tone="gray" dot={false}>{ROLES[u.role]}</Badge>
                  <Badge tone={u.status === "ACTIVE" ? "green" : u.status === "PENDING" ? "violet" : "gray"}>{u.status === "ACTIVE" ? "Attivo" : u.status === "PENDING" ? "In attesa" : "Disattivo"}</Badge>
                  {u.id !== me.id && (
                    <div className="flex gap-1">
                      {u.status !== "ACTIVE" && <ActionButton run={setUserStatusAction.bind(null, u.id, "ACTIVE")} size="sm" variant="primary">Attiva</ActionButton>}
                      {u.status === "ACTIVE" && <ActionButton run={setUserStatusAction.bind(null, u.id, "DISABLED")} size="sm" variant="ghost" confirm={`Disattivare ${u.name}?`}>Disattiva</ActionButton>}
                      <ActionButton run={resetPasswordAction.bind(null, u.id)} size="sm" variant="ghost" confirm="Generare una nuova password temporanea?">Reset password</ActionButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card className="self-start">
          <CardHeader title="Nuovo utente" subtitle="Il sistema genera una password temporanea" />
          <div className="p-5">
            <ActionForm action={createUserAction} submit="Crea utente">
              <Field label="Nome e cognome"><input name="name" required className="input" /></Field>
              <Field label="Email"><input name="email" type="email" required className="input" /></Field>
              <Field label="Telefono"><input name="phone" className="input" /></Field>
              <Field label="Ruolo">
                <select name="role" className="input" defaultValue="ADMIN">{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </Field>
              <Field label="Attività (per ristoratori e organizzatori)">
                <select name="organizationId" className="input" defaultValue="">
                  <option value="">—</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.kind === "RESTAURANT" ? "ristorante" : "organizzatore"})</option>)}
                </select>
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
