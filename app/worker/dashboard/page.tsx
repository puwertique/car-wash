import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { LogoutButton } from "@/components/worker/logout-button";
import { OrderPanel } from "./order-panel";

export default async function WorkerDashboardPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  return (
    <main className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Worker dashboard</h1>
        <LogoutButton />
      </div>
      <p className="text-sm text-black/70">
        Signed in as {profile.email} ({profile.role}).
      </p>

      <div className="mt-4">
        <OrderPanel />
      </div>

      <Link href="/worker/profile" className="mt-6 inline-block text-sm underline">
        View my profile
      </Link>
    </main>
  );
}


