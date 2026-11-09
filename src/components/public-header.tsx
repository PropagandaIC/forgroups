import Link from "next/link";
import { getUser, homeFor } from "@/lib/auth";
import { Logo, LinkButton } from "./ui";

export async function PublicHeader({ transparent = false }: { transparent?: boolean }) {
  const user = await getUser();
  return (
    <header className={transparent ? "absolute inset-x-0 top-0 z-20" : "sticky top-0 z-20 border-b border-ink-200/70 bg-white/85 backdrop-blur"}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="ForGroups – home">
          <Logo dark={transparent} />
        </Link>
        <nav className={`hidden items-center gap-6 text-sm font-medium md:flex ${transparent ? "text-ink-200" : "text-ink-600"}`}>
          <Link href="/ristoranti" className="hover:text-brand-400">Ristoranti</Link>
          <Link href="/#come-funziona" className="hover:text-brand-400">Come funziona</Link>
          <Link href="/per-i-ristoratori" className="hover:text-brand-400">Per i ristoratori</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <LinkButton href={homeFor(user.role)} variant="primary" size="sm">
              {user.role === "ADMIN" ? "Pannello" : "La mia area"}
            </LinkButton>
          ) : (
            <>
              <Link href="/accedi" className={`px-3 text-sm font-medium ${transparent ? "text-white" : "text-ink-700"} hover:text-brand-400`}>
                Accedi
              </Link>
              <LinkButton href="/registrati" variant="primary" size="sm">
                Registrati
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-500">
            Ristoranti e location selezionati per gruppi turistici, scuole, pellegrinaggi ed eventi aziendali in tutta Italia.
          </p>
          <p className="mt-4 text-sm text-ink-500">Via SS. Quattro 56, 00184 Roma · +39 06 88 805 384</p>
        </div>
        <div className="text-sm">
          <div className="font-semibold text-ink-900">Organizzatori</div>
          <ul className="mt-3 space-y-2 text-ink-500">
            <li><Link href="/ristoranti" className="hover:text-ink-900">Cerca ristoranti</Link></li>
            <li><Link href="/registrati" className="hover:text-ink-900">Crea un account agenzia</Link></li>
            <li><Link href="/richiesta" className="hover:text-ink-900">Richiedi un preventivo</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="font-semibold text-ink-900">Ristoratori</div>
          <ul className="mt-3 space-y-2 text-ink-500">
            <li><Link href="/per-i-ristoratori" className="hover:text-ink-900">Entra nel circuito</Link></li>
            <li><Link href="/accedi" className="hover:text-ink-900">Area ristoratori</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-4 text-center text-xs text-ink-400">© {new Date().getFullYear()} ForGroups · Privacy · Cookie · Termini</div>
    </footer>
  );
}
