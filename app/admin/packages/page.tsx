import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { listPackagesForManagement } from "@/lib/admin/packages";
import { LogoutButton } from "@/components/worker/logout-button";
import { PackagesManager } from "./packages-manager";

export default async function AdminPackagesPage() {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) redirect("/login");
  const packages = await listPackagesForManagement();
  return <main className="flex-1 space-y-6 p-6"><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Packages</h1><LogoutButton /></div><PackagesManager packages={packages} /></main>;
}
