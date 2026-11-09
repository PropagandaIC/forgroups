import { BookingDetail } from "@/components/booking-detail";
import { requireAdmin } from "@/lib/auth";

export default async function AdminBooking({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ pagamento?: string }> }) {
  const [user, { code }, sp] = await Promise.all([requireAdmin(), params, searchParams]);
  return <BookingDetail code={code} user={user} basePath="/admin/prenotazioni" flash={sp.pagamento} />;
}
