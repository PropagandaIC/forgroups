import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bookingRole } from "@/lib/permissions";
import { dayLong, money } from "@/lib/format";
import { BOOKING_STATUS, PAYMENT_MODE } from "@/lib/labels";
import { Logo } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Voucher" };

type Course = { course: string; items: string[] };

export default async function Voucher({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const { code } = await params;
  const b = await db.booking.findUnique({ where: { code }, include: { restaurant: true, organizer: true, menu: true, room: true } });
  if (!b || !bookingRole(user, b)) notFound();
  const courses: Course[] = b.menu?.courses ? JSON.parse(b.menu.courses) : [];
  const due = b.totalCents - b.paidCents;
  return (
    <div className="min-h-dvh bg-ink-100 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl bg-white p-10 shadow-[var(--shadow-card)] print:shadow-none">
        <div className="flex items-start justify-between">
          <Logo />
          <div className="text-right text-sm">
            <div className="text-xs text-ink-500">Voucher</div>
            <div className="text-xl font-semibold">{b.code}</div>
            <div className="text-xs text-ink-500">{BOOKING_STATUS[b.status].label}</div>
          </div>
        </div>
        <h1 className="mt-8 text-2xl font-semibold">{b.restaurant.name}</h1>
        <p className="text-sm text-ink-600">{b.restaurant.address}, {b.restaurant.zip} {b.restaurant.city} · {b.restaurant.phone}</p>
        <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-ink-50 p-4 text-sm">
          <div><div className="text-xs text-ink-500">Data</div><div className="font-medium first-letter:uppercase">{dayLong(b.date)}</div></div>
          <div><div className="text-xs text-ink-500">Orario</div><div className="font-medium">{b.time}{b.room ? ` · ${b.room.name}` : ""}</div></div>
          <div><div className="text-xs text-ink-500">Persone</div><div className="font-medium">{b.pax}{b.freePax ? ` (${b.freePax} gratuità)` : ""}</div></div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Gruppo</div>
            <div className="mt-1 font-medium">{b.groupName ?? b.contactName}</div>
            <div>{b.organizer?.name}</div>
            <div>Referente: {b.contactName} {b.contactPhone}</div>
            {b.groupLeader && <div>Capogruppo: {b.groupLeader} {b.groupLeaderPhone}</div>}
            {b.dietaryNotes && <div className="mt-2 font-medium">Esigenze: {b.dietaryNotes}</div>}
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{b.menu?.name ?? "Menu"}</div>
            <ul className="mt-1 space-y-0.5">
              {courses.map((c) => <li key={c.course}><b>{c.course}:</b> {c.items.join(", ")}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-6 border-t border-ink-200 pt-4 text-sm">
          <div className="flex justify-between"><span>Pagamento</span><span>{PAYMENT_MODE[b.paymentMode]}</span></div>
          <div className="flex justify-between"><span>Totale</span><span>{money(b.totalCents)}</span></div>
          <div className="flex justify-between"><span>Già pagato</span><span>{money(b.paidCents)}</span></div>
          <div className="mt-1 flex justify-between text-base font-semibold"><span>Da pagare sul posto</span><span>{money(due)}</span></div>
        </div>
        {b.notes && <p className="mt-4 text-sm text-ink-600">Note: {b.notes}</p>}
        <p className="mt-8 text-xs text-ink-400">ForGroups · Via SS. Quattro 56, 00184 Roma · +39 06 88 805 384 · Presentare questo voucher al ristorante.</p>
        <div className="mt-6 print:hidden"><PrintButton /></div>
      </div>
    </div>
  );
}
