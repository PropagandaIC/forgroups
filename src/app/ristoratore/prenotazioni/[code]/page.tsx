import { BookingDetail } from "@/components/booking-detail";
import { requireUser } from "@/lib/auth";

export default async function RBooking({ params }: { params: Promise<{ code: string }> }) {
  const [user, { code }] = await Promise.all([requireUser(["RESTAURANT"]), params]);
  return <BookingDetail code={code} user={user} basePath="/ristoratore/prenotazioni" />;
}
