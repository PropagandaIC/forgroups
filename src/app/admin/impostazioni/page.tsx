import { CheckCircle2, CircleDashed } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { PasswordForm } from "@/components/password-form";
import { stripeEnabled } from "@/lib/stripe";
import { aiEnabled } from "@/lib/ai";

export default function Impostazioni() {
  const items = [
    ["Pagamenti online (Stripe Connect)", stripeEnabled(), "STRIPE_SECRET_KEY: chiave del nuovo account Stripe ForGroups (consigliata una restricted key rk_…)."],
    ["Webhook Stripe", Boolean(process.env.STRIPE_WEBHOOK_SECRET), "STRIPE_WEBHOOK_SECRET: endpoint /api/stripe/webhook per gli eventi checkout.session.*"],
    ["Assistente AI per le richieste", aiEnabled(), "ANTHROPIC_API_KEY: abilita “Richiesta da email” con estrazione automatica dei dati."],
    ["Indirizzo pubblico", Boolean(process.env.APP_URL && !process.env.APP_URL.includes("localhost")), `APP_URL attuale: ${process.env.APP_URL ?? "non impostato"}`],
  ] as const;
  return (
    <>
      <PageHeader title="Impostazioni" subtitle="Integrazioni e sicurezza" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Integrazioni" subtitle="Si configurano con le variabili d'ambiente del server" />
          <ul className="divide-y divide-ink-100">
            {items.map(([label, ok, hint]) => (
              <li key={label} className="flex gap-3 px-5 py-4">
                {ok ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <CircleDashed className="size-5 shrink-0 text-ink-400" />}
                <div>
                  <div className="text-sm font-medium">{label} <span className={`ml-1 text-xs ${ok ? "text-emerald-700" : "text-ink-500"}`}>{ok ? "attivo" : "da configurare"}</span></div>
                  <div className="text-xs text-ink-500">{hint}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="La tua password" />
          <div className="p-5"><PasswordForm /></div>
        </Card>
      </div>
    </>
  );
}
