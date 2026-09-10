import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { LogoutButton } from "@/components/worker/logout-button";
import { listServicesForAdmin } from "@/lib/admin/orders";
import { CreateTestOrderForm } from "./create-test-order-form";
import { RegisterWorkerForm } from "./register-worker-form";

export default async function AdminTestPage() {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
    redirect("/login");
  }

  const services = await listServicesForAdmin();

  return (
    <main className="flex-1 space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin / test console</h1>
        <LogoutButton />
      </div>
      <p className="text-sm text-black/70">
        Signed in as {profile.email} ({profile.role}).
      </p>

      <section>
        <h2 className="mb-2 font-medium">Register worker</h2>
        <p className="mb-2 text-xs text-black/50">
          Creates a login account (email/password set here — share the
          password with the worker and have them change it later) and a
          worker profile. There is no self-registration, per spec.
        </p>
        <RegisterWorkerForm />
      </section>

      <section>
        <h2 className="mb-2 font-medium">Create test order</h2>
        <CreateTestOrderForm services={services} />
      </section>
    </main>
  );
}

