import type { Metadata } from "next";
import { ArrowRight, BarChart3, CalendarRange, Smartphone, Wallet } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { LinkButton } from "@/components/ui";

export const metadata: Metadata = { title: "Per i ristoratori" };

export default function PerRistoratori() {
  const points = [
    [CalendarRange, "Prenotazioni da agenzie di tutto il mondo", "Tour operator, scuole, pellegrinaggi e aziende prenotano i tuoi menu per gruppi con disponibilità in tempo reale."],
    [Smartphone, "Tutto dal telefono", "Conferma una prenotazione con un tocco, aggiorna sale, menu e giorni di chiusura in un attimo."],
    [Wallet, "Incassi diretti e sicuri", "Il cliente paga online e il denaro arriva sul tuo conto tramite Stripe. La provvigione è trattenuta in automatico: niente fatture da rincorrere."],
    [BarChart3, "Numeri chiari", "Coperti, incassi e prenotazioni dei prossimi giorni sempre sotto controllo."],
  ] as const;
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">Riempi la sala con i gruppi, senza pensieri.</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-600">
          ForGroups porta al tuo ristorante gruppi organizzati da agenzie selezionate. Tu cucini, noi pensiamo a contatti, conferme e pagamenti.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {points.map(([Icon, t, d]) => (
            <div key={t} className="card p-6">
              <Icon className="size-6 text-brand-600" />
              <h2 className="mt-3 font-semibold">{t}</h2>
              <p className="mt-1 text-sm text-ink-600">{d}</p>
            </div>
          ))}
        </div>
        <LinkButton href="/registrati?tipo=ristorante" variant="primary" size="lg" className="mt-10">
          Candida il tuo ristorante <ArrowRight className="size-4" />
        </LinkButton>
      </main>
    </>
  );
}
