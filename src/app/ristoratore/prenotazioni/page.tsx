import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { BookingRows } from "@/components/booking-rows";
import { todayUTC } from "@/lib/format";

export default async function RBookings({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const user = await requireUser(["RESTAURANT"]);
  const { vista } = await searchParams;
  const past = vista === "passate";
  const rows = await db.booking.findMany({
    where: { restaurantId: user.organizationId ?? "-", date: past ? { lt: todayUTC() } : { gte: todayUTC() } },
    orderBy: past ? [{ date: "desc" }] : [{ date: "asc" }, { time: "asc" }],
    take: 200,
    include: { restaurant: true, organizer: true },
  });
  return (
    <>
      <PageHeader title="Prenotazioni" />
      <div className="mb-4 flex gap-1 rounded-xl bg-ink-100 p-1 text-sm font-medium sm:w-fit">
        <Link href="?" className={`rounded-lg px-3 py-1.5 ${!past ? "bg-white shadow-sm" : "text-ink-500"}`}>In arrivo</Link>
        <Link href="?vista=passate" className={`rounded-lg px-3 py-1.5 ${past ? "bg-white shadow-sm" : "text-ink-500"}`}>Passate</Link>
      </div>
      <Card><BookingRows rows={rows} basePath="/ristoratore/prenotazioni" show="client" /></Card>
    </>
  );
}
