import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { InquiryForm } from "@/components/inquiry-form";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Richiedi un preventivo" };

export default async function Richiesta() {
  const user = await getUser();
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Richiedi un preventivo</h1>
        <p className="mt-1 text-sm text-ink-500">
          Raccontaci il tuo gruppo: ti proponiamo i ristoranti più adatti, con menu e prezzi, entro poche ore lavorative.
        </p>
        <div className="card mt-6 p-6">
          <InquiryForm defaults={{ contactName: user?.name, email: user?.email, phone: user?.phone ?? undefined, company: user?.organization?.name }} />
        </div>
      </main>
    </>
  );
}
