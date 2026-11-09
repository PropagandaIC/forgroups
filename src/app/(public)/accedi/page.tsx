import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { LoginForm } from "@/components/auth-forms";
import { getUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Accedi" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getUser();
  if (user) redirect(homeFor(user.role));
  const { next } = await searchParams;
  return (
    <>
      <PublicHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Bentornato</h1>
        <p className="mt-1 text-sm text-ink-500">Accedi alla tua area ForGroups.</p>
        <div className="card mt-6 p-6">
          <LoginForm next={next} />
        </div>
      </main>
    </>
  );
}
