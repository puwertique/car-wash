import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const documentBuckets = {
  vehicle_photo_path: "worker-vehicle-photos",
  carte_grise_photo_path: "worker-carte-grise",
  cin_photo_path: "worker-cin",
  employment_contract_path: "worker-contracts",
  insurance_photo_path: "worker-insurance",
} as const;

export async function getWorkerDetailsForAdmin(workerId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data } = await supabase
    .from("workers")
    .select("id, auth_user_id, first_name, last_name, phone, city, status, employment_status, compensation_model, compensation_value, work_vehicle_type, vehicle_plate_number, profile_photo_url, full_address, birth_date, cin_number, eligible_package_ids, vehicle_photo_path, carte_grise_photo_path, cin_photo_path, employment_contract_path, insurance_photo_path, created_at")
    .eq("id", workerId)
    .maybeSingle();

  if (!data) return null;
  const { data: authData } = await admin.auth.admin.getUserById(data.auth_user_id);
  const files: Record<string, string | null> = { portrait: data.profile_photo_url ?? null };
  for (const [field, bucket] of Object.entries(documentBuckets)) {
    const path = data[field as keyof typeof data] as string | null;
    files[field] = path ? (await admin.storage.from(bucket).createSignedUrl(path, 300)).data?.signedUrl ?? null : null;
  }
  return { ...data, email: authData.user?.email ?? null, files };
}
