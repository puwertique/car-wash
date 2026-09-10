import { createAdminClient } from "@/lib/supabase/admin";
import type { RegisterWorkerInput } from "@/lib/validation/register-worker";

export type RegisterWorkerResult =
  | { error: string; workerId?: undefined }
  | { error: null; workerId: string };

/**
 * Admin-only worker registration: creates the Supabase Auth user
 * (email/password set directly by the admin — no self-registration,
 * per spec) and the matching `workers` row. Uses the service-role
 * client since creating auth users requires elevated privileges.
 * Rolls back the auth user if the `workers` insert fails.
 */
export async function registerWorker(
  input: RegisterWorkerInput,
): Promise<RegisterWorkerResult> {
  const admin = createAdminClient();

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (userError || !userData.user) {
    return { error: userError?.message ?? "Failed to create account." };
  }

  const { data: worker, error: workerError } = await admin
    .from("workers")
    .insert({
      auth_user_id: userData.user.id,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
      city: input.city ?? null,
      service_area: input.service_area ?? null,
      status: "OFFLINE",
    })
    .select("id")
    .single();

  if (workerError || !worker) {
    await admin.auth.admin.deleteUser(userData.user.id);
    return { error: "Failed to create worker profile." };
  }

  return { error: null, workerId: worker.id };
}
