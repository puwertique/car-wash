import { createClient } from "@/lib/supabase/server";
import type { UpdateLocationInput } from "@/lib/validation/location";

export type UpdateLocationResult = { error: string | null };

/**
 * Upserts the calling worker's current GPS fix. Uses the user's own
 * session (RLS enforces they can only write their own row).
 */
export async function updateWorkerLocation(
  authUserId: string,
  input: UpdateLocationInput,
): Promise<UpdateLocationResult> {
  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (!worker) return { error: "Worker profile not found." };

  const { error } = await supabase.from("worker_current_locations").upsert({
    worker_id: worker.id,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy_meters: input.accuracy_meters ?? null,
    location: `SRID=4326;POINT(${input.longitude} ${input.latitude})`,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: "Failed to update location." };

  return { error: null };
}
