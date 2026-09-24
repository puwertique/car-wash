import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DirectBookingForm } from "./form";

export default async function NewWorkerBookingPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  const { data: worker } = await supabase.from("workers").select("employment_status").eq("auth_user_id", profile.userId).single();
  if (worker?.employment_status !== "active") redirect("/worker/dashboard");
  const { data: packages } = await supabase.from("packages").select("id, name, vehicle_category, vehicle_size, base_price").eq("is_active", true).order("name");
  return <main className="flex-1 space-y-6 p-6"><div><Link href="/worker/dashboard" className="text-sm underline">Back to dashboard</Link><h1 className="mt-2 text-xl font-semibold">New direct booking</h1><p className="mt-1 text-sm text-black/60">Create a booking for a customer you met directly. Your current GPS location will be saved automatically.</p></div><DirectBookingForm packages={packages ?? []} /></main>;
}
