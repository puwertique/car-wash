import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RegisterWorkerInput } from "@/lib/validation/register-worker";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Upload = { bucket: string; file: File; required: boolean; kind: "image" | "pdf"; name: string };
type StoredUpload = Upload & { path: string };

export type RegisterWorkerResult =
  | { error: string; workerId?: undefined }
  | { error: null; workerId: string };

function validateFile(upload: Upload) {
  if (upload.kind === "image" && (!IMAGE_TYPES.has(upload.file.type) || upload.file.size > MAX_IMAGE_BYTES)) return "Images must be JPEG, PNG, or WebP files smaller than 5MB.";
  if (upload.kind === "pdf" && (upload.file.type !== "application/pdf" || upload.file.size > MAX_PDF_BYTES)) return "The employment contract must be a PDF file smaller than 10MB.";
  if (upload.file.size === 0 && upload.required) return "Required documents cannot be empty.";
  return null;
}

async function uploadFile(admin: ReturnType<typeof createAdminClient>, upload: Upload, workerId: string): Promise<StoredUpload | null> {
  const extension = upload.kind === "pdf" ? "pdf" : upload.file.type.split("/")[1];
  const path = `${workerId}/${upload.name}.${extension}`;
  const { error } = await admin.storage.from(upload.bucket).upload(path, Buffer.from(await upload.file.arrayBuffer()), { contentType: upload.file.type, upsert: false });
  return error ? null : { ...upload, path };
}

async function removeUploads(admin: ReturnType<typeof createAdminClient>, uploads: StoredUpload[]) {
  await Promise.all(uploads.map((upload) => admin.storage.from(upload.bucket).remove([upload.path])));
}

export async function registerWorker(input: RegisterWorkerInput): Promise<RegisterWorkerResult> {
  const uploads: Upload[] = [
    { bucket: "worker-vehicle-photos", file: input.vehicle_photo, required: true, kind: "image", name: "vehicle" },
    { bucket: "worker-carte-grise", file: input.carte_grise_photo, required: true, kind: "image", name: "carte-grise" },
  ];
  if (input.cin_photo) uploads.push({ bucket: "worker-cin", file: input.cin_photo, required: false, kind: "image", name: "cin" });
  if (input.employment_contract) uploads.push({ bucket: "worker-contracts", file: input.employment_contract, required: false, kind: "pdf", name: "contract" });
  if (input.insurance_photo) uploads.push({ bucket: "worker-insurance", file: input.insurance_photo, required: false, kind: "image", name: "insurance" });
  for (const upload of uploads) {
    const error = validateFile(upload);
    if (error) return { error };
  }
  if (input.portrait) {
    const error = validateFile({ bucket: "worker-photos", file: input.portrait, required: false, kind: "image", name: "portrait" });
    if (error) return { error };
  }

  const admin = createAdminClient();
  const { data: coveredCity } = await admin.from("covered_cities").select("id").eq("id", input.city.toLowerCase()).eq("is_active", true).maybeSingle();
  if (!coveredCity) return { error: "This city is not currently covered." };
  const { data: userData, error: userError } = await admin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true });
  if (userError || !userData.user) return { error: userError?.message ?? "Failed to create account." };

  const workerId = randomUUID();
  const storedUploads: StoredUpload[] = [];
  for (const upload of uploads) {
    const stored = await uploadFile(admin, upload, workerId);
    if (!stored) {
      await removeUploads(admin, storedUploads);
      await admin.auth.admin.deleteUser(userData.user.id);
      return { error: "Failed to upload worker documents." };
    }
    storedUploads.push(stored);
  }

  let portraitUrl: string | null = null;
  if (input.portrait) {
    const portrait = await uploadFile(admin, { bucket: "worker-photos", file: input.portrait, required: false, kind: "image", name: "portrait" }, workerId);
    if (!portrait) {
      await removeUploads(admin, storedUploads);
      await admin.auth.admin.deleteUser(userData.user.id);
      return { error: "Failed to upload worker portrait." };
    }
    portraitUrl = admin.storage.from("worker-photos").getPublicUrl(portrait.path).data.publicUrl;
  }

  const pathByName = Object.fromEntries(storedUploads.map((upload) => [upload.name, upload.path]));
  const { data: worker, error: workerError } = await admin.from("workers").insert({
    id: workerId,
    auth_user_id: userData.user.id,
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone,
    city: input.city,
    compensation_model: input.compensation_model,
    compensation_value: input.compensation_value,
    work_vehicle_type: input.work_vehicle_type,
    vehicle_plate_number: input.vehicle_plate_number,
    vehicle_photo_path: pathByName.vehicle,
    carte_grise_photo_path: pathByName["carte-grise"],
    cin_number: input.cin_number ?? null,
    cin_photo_path: pathByName.cin ?? null,
    full_address: input.full_address ?? null,
    birth_date: input.birth_date ?? null,
    eligible_package_ids: input.eligible_package_ids ?? null,
    employment_contract_path: pathByName.contract ?? null,
    insurance_photo_path: pathByName.insurance ?? null,
    profile_photo_url: portraitUrl,
    employment_status: "active",
    status: "OFFLINE",
  }).select("id").single();

  if (workerError || !worker) {
    await removeUploads(admin, storedUploads);
    if (input.portrait) await admin.storage.from("worker-photos").remove([`${workerId}/portrait.${input.portrait.type.split("/")[1]}`]);
    await admin.auth.admin.deleteUser(userData.user.id);
    return { error: workerError?.message ?? "Failed to create worker profile." };
  }

  return { error: null, workerId: worker.id };
}
