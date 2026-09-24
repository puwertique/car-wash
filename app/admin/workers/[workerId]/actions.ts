"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";

export type WorkerActionState = { error: string | null; success: string | null };

async function requireAdmin() {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) throw new Error("Not authorized.");
  return profile;
}

function fileValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

const imageBuckets = {
  vehicle_photo: "worker-vehicle-photos",
  carte_grise_photo: "worker-carte-grise",
  cin_photo: "worker-cin",
  insurance_photo: "worker-insurance",
  portrait: "worker-photos",
} as const;

export async function updateWorker(_previous: WorkerActionState, formData: FormData): Promise<WorkerActionState> {
  await requireAdmin();
  const workerId = String(formData.get("worker_id"));
  const admin = createAdminClient();
  const updates = {
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    compensation_model: String(formData.get("compensation_model")),
    compensation_value: Number(formData.get("compensation_value")),
    work_vehicle_type: String(formData.get("work_vehicle_type")),
    vehicle_plate_number: String(formData.get("vehicle_plate_number") ?? "").trim(),
    cin_number: String(formData.get("cin_number") ?? "").trim() || null,
    full_address: String(formData.get("full_address") ?? "").trim() || null,
    birth_date: String(formData.get("birth_date") ?? "") || null,
    eligible_package_ids: String(formData.get("eligible_package_ids") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  };
  const { data: worker } = await admin.from("workers").select("auth_user_id").eq("id", workerId).single();
  if (!worker) return { error: "Worker not found.", success: null };

  const email = String(formData.get("email") ?? "").trim();
  if (email) {
    const { error } = await admin.auth.admin.updateUserById(worker.auth_user_id, { email, email_confirm: false });
    if (error) return { error: "Unable to update email. A confirmation may be required.", success: null };
  }

  const uploaded: { bucket: string; path: string }[] = [];
  for (const [field, bucket] of Object.entries(imageBuckets)) {
    const file = fileValue(formData, field);
    if (!file) continue;
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${workerId}/${field}.${extension}`;
    const { error } = await admin.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
    if (error) return { error: `Unable to upload ${field}.`, success: null };
    uploaded.push({ bucket, path });
    if (field === "portrait") updates["profile_photo_url" as keyof typeof updates] = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl as never;
    else updates[`${field}_path` as keyof typeof updates] = path as never;
  }

  const contract = fileValue(formData, "employment_contract");
  if (contract) {
    const path = `${workerId}/employment-contract.pdf`;
    const { error } = await admin.storage.from("worker-contracts").upload(path, Buffer.from(await contract.arrayBuffer()), { contentType: "application/pdf", upsert: true });
    if (error) return { error: "Unable to upload employment contract.", success: null };
    updates["employment_contract_path" as keyof typeof updates] = path as never;
  }

  const { error } = await admin.from("workers").update(updates).eq("id", workerId);
  if (error) return { error: "Unable to save worker details.", success: null };
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/workers");
  return { error: null, success: "Worker details saved." };
}

export async function setEmploymentStatus(_previous: WorkerActionState, formData: FormData): Promise<WorkerActionState> {
  await requireAdmin();
  const workerId = String(formData.get("worker_id"));
  const status = String(formData.get("employment_status"));
  if (!["active", "suspended", "archived"].includes(status)) return { error: "Invalid employment status.", success: null };
  const admin = createAdminClient();
  const { data: worker } = await admin.from("workers").select("auth_user_id").eq("id", workerId).single();
  if (!worker) return { error: "Worker not found.", success: null };
  const { error } = await admin.from("workers").update({ employment_status: status }).eq("id", workerId);
  if (error) return { error: "Unable to update employment status.", success: null };
  if (status === "archived" || status === "suspended") await admin.auth.admin.updateUserById(worker.auth_user_id, { ban_duration: status === "archived" ? "876000h" : "8760h" });
  if (status === "active") await admin.auth.admin.updateUserById(worker.auth_user_id, { ban_duration: "none" });
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/workers");
  return { error: null, success: `Worker account ${status}.` };
}
