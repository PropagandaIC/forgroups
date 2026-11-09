import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ForGroups – Ristoranti per gruppi in Italia", template: "%s · ForGroups" },
  description:
    "Prenota ristoranti per gruppi turistici, scuole, pellegrinaggi ed eventi aziendali in tutta Italia. Disponibilità in tempo reale, menu dedicati, pagamento sicuro.",
};

export const viewport: Viewport = { themeColor: "#1d1d1b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
