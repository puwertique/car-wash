import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { getWorkerProfileByAuthUserId } from "@/lib/workers/profile";
import { LogoutButton } from "@/components/worker/logout-button";
import { StatusToggle } from "./status-toggle";
import { PhotoUploadForm } from "./photo-upload-form";

export default async function WorkerProfilePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const worker = await getWorkerProfileByAuthUserId(session.userId);
  if (!worker) {
    return (
      <main className="flex-1 p-6">
        <p className="text-sm text-black/70">
          No worker profile is linked to this account yet. Ask an admin to
          create one.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">My profile</h1>
        <LogoutButton />
      </div>

      <div className="space-y-6 max-w-md">
        <div className="flex items-center gap-4">
          {worker.profilePhotoUrl ? (
            <Image
              src={worker.profilePhotoUrl}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-black/10" />
          )}
          <div>
            <p className="font-medium">
              {worker.firstName} {worker.lastName}
            </p>
            <p className="text-sm text-black/60">{worker.phone}</p>
          </div>
        </div>

        <PhotoUploadForm />

        <StatusToggle status={worker.status} />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-black/60">City</dt>
          <dd>{worker.city ?? "—"}</dd>
          <dt className="text-black/60">Service area</dt>
          <dd>{worker.serviceArea ?? "—"}</dd>
          <dt className="text-black/60">Vehicle</dt>
          <dd>
            {worker.vehicle
              ? `${worker.vehicle.type} — ${worker.vehicle.brand ?? ""} ${worker.vehicle.model ?? ""}`.trim()
              : "Not assigned"}
          </dd>
          <dt className="text-black/60">Registration</dt>
          <dd>{worker.vehicle?.registrationNumber ?? "—"}</dd>
        </dl>

        <Link href="/worker/dashboard" className="text-sm underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
