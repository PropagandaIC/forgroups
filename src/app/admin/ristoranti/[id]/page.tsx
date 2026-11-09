import { requireAdmin } from "@/lib/auth";
import { RestaurantManage, type RestaurantTab } from "@/components/restaurant-manage";

export default async function AdminRestaurant({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; stripe?: string }> }) {
  const [user, { id }, sp] = await Promise.all([requireAdmin(), params, searchParams]);
  const tab = (["panoramica", "scheda", "offerta", "pagamenti"].includes(sp.tab ?? "") ? sp.tab : "panoramica") as RestaurantTab;
  return <RestaurantManage orgId={id} user={user} tab={tab} basePath={`/admin/ristoranti/${id}`} flash={sp.stripe} />;
}
