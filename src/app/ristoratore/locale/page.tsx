import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { RestaurantManage, type RestaurantTab } from "@/components/restaurant-manage";

export default async function Locale({ searchParams }: { searchParams: Promise<{ tab?: string; stripe?: string }> }) {
  const user = await requireUser(["RESTAURANT"]);
  if (!user.organizationId) notFound();
  const sp = await searchParams;
  const tab = (["panoramica", "scheda", "offerta", "pagamenti"].includes(sp.tab ?? "") ? sp.tab : "offerta") as RestaurantTab;
  return <RestaurantManage orgId={user.organizationId} user={user} tab={tab} basePath="/ristoratore/locale" flash={sp.stripe} />;
}
