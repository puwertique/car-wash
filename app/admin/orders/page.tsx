import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/worker/logout-button";
import { OrdersSection } from "@/components/admin/orders-section";
import { getSessionProfile } from "@/lib/auth/session";

export default async function AdminOrdersPage() {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) redirect("/login");

  return <main className="flex-1 space-y-6 p-6"><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Orders</h1><LogoutButton /></div><OrdersSection /></main>;
}