import { BookingDetail } from "@/components/booking-detail";
import { requireUser } from "@/lib/auth";

export default async function AreaBooking({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ pagamento?: string; nuova?: string }> }) {
  const [user, { code }, sp] = await Promise.all([requireUser(["ORGANIZER"]), params, searchParams]);
  return <BookingDetail code={code} user={user} basePath="/area/prenotazioni" flash={sp.pagamento ?? (sp.nuova ? "nuova" : undefined)} />;
}
