"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white">
      <Printer className="size-4" /> Stampa o salva PDF
    </button>
  );
}
