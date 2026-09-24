import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/worker/logout-button";
import { getSessionProfile } from "@/lib/auth/session";
import { listCoveredCities } from "@/lib/admin/cities";
import { CitiesSection } from "@/app/admin/test/cities-section";

export default async function AdminCitiesPage() {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) redirect("/login");
  const cities = await listCoveredCities();

  return <main className="flex-1 space-y-6 p-6"><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Covered cities</h1><LogoutButton /></div><CitiesSection cities={cities} /></main>;
}
