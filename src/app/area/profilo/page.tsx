import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { Card, CardHeader, Field, PageHeader } from "@/components/ui";
import { PasswordForm } from "@/components/password-form";
import { saveOrgAction } from "@/app/actions/org";

export default async function Profilo() {
  const user = await requireUser(["ORGANIZER"]);
  const org = user.organizationId ? await db.organization.findUnique({ where: { id: user.organizationId }, include: { members: true } }) : null;
  return (
    <>
      <PageHeader title="Profilo e team" />
      <div className="grid gap-6 lg:grid-cols-2">
        {org && (
          <Card>
            <CardHeader title="Dati dell'organizzazione" subtitle="Usati per voucher e ricevute" />
            <div className="p-5">
              <ActionForm action={saveOrgAction} hidden={{ orgId: org.id }}>
                <Field label="Nome"><input name="name" defaultValue={org.name} className="input" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email"><input name="email" defaultValue={org.email ?? ""} className="input" /></Field>
                  <Field label="Telefono"><input name="phone" defaultValue={org.phone ?? ""} className="input" /></Field>
                  <Field label="Città"><input name="city" defaultValue={org.city ?? ""} className="input" /></Field>
                  <Field label="Partita IVA"><input name="vatNumber" defaultValue={org.vatNumber ?? ""} className="input" /></Field>
                  <Field label="Ragione sociale"><input name="billingName" defaultValue={org.billingName ?? ""} className="input" /></Field>
                  <Field label="Codice SDI / PEC"><input name="sdiCode" defaultValue={org.sdiCode ?? ""} className="input" /></Field>
                </div>
              </ActionForm>
            </div>
          </Card>
        )}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Colleghi con accesso" subtitle="Per aggiungere un collega scrivici: lo attiviamo subito" />
            <ul className="divide-y divide-ink-100 text-sm">
              {org?.members.map((m) => <li key={m.id} className="px-5 py-3"><div className="font-medium">{m.name}</div><div className="text-xs text-ink-500">{m.email}</div></li>)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Password" />
            <div className="p-5"><PasswordForm /></div>
          </Card>
        </div>
      </div>
    </>
  );
}
