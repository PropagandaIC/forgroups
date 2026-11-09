import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Registrati" };

export default async function Signup({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Crea il tuo account ForGroups</h1>
        <p className="mt-1 text-sm text-ink-500">Gratis per agenzie, scuole, parrocchie e organizzatori. I ristoratori pagano solo una provvigione sulle prenotazioni.</p>
        <div className="card mt-6 p-6">
          <SignupForm initialKind={tipo === "ristorante" ? "RESTAURANT" : "ORGANIZER"} />
        </div>
      </main>
    </>
  );
}
