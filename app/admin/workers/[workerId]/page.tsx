import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { getWorkerDetailsForAdmin } from "@/lib/admin/worker-details";
import { WorkerDetailsForm } from "./details-form";

export default async function AdminWorkerDetailsPage({ params }: { params: Promise<{ workerId: string }> }) {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) redirect("/login");
  const { workerId } = await params;
  const worker = await getWorkerDetailsForAdmin(workerId);
  if (!worker) notFound();

  return <WorkerDetailsForm worker={worker} />;
}
