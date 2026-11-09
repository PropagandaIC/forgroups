import Link from "next/link";
import type { Booking, Organization } from "@prisma/client";
import { Badge, Empty } from "./ui";
import { day, money } from "@/lib/format";
import { BOOKING_STATUS, PAYMENT_STATUS } from "@/lib/labels";
import { Ticket } from "lucide-react";

type Row = Booking & { restaurant: Organization; organizer?: Organization | null };

/** Elenco prenotazioni compatto per i portali (agenzia e ristoratore) */
export function BookingRows({ rows, basePath, show = "restaurant", empty = "Nessuna prenotazione" }: { rows: Row[]; basePath: string; show?: "restaurant" | "client"; empty?: string }) {
  if (!rows.length) return <Empty icon={<Ticket className="size-5" />} title={empty} />;
  return (
    <ul className="divide-y divide-ink-100">
      {rows.map((b) => (
        <li key={b.id}>
          <Link href={`${basePath}/${b.code}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-ink-50">
            <div className="w-32 shrink-0">
              <div className="font-medium">{day(b.date)}</div>
              <div className="text-xs text-ink-500">ore {b.time} · {b.code}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{show === "restaurant" ? b.restaurant.name : (b.organizer?.name ?? b.contactName)}</div>
              <div className="truncate text-xs text-ink-500">{b.groupName ?? b.groupType ?? ""}{show === "restaurant" ? ` · ${b.restaurant.city}` : ""}</div>
            </div>
            <div className="w-16 text-right tabular-nums">{b.pax} p.</div>
            <div className="w-24 text-right font-medium tabular-nums">{money(b.totalCents)}</div>
            <div className="flex w-56 justify-end gap-1.5">
              <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
              {b.paymentMode !== "ON_SITE" && b.status === "CONFIRMED" && <Badge tone={PAYMENT_STATUS[b.paymentStatus].tone}>{PAYMENT_STATUS[b.paymentStatus].label}</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
