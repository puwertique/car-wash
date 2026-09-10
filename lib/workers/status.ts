import { createClient } from "@/lib/supabase/server";
import {
  workerManualStatusSchema,
  type WorkerManualStatus,
} from "@/lib/validation/workers";

export type UpdateStatusResult = { error: string | null };

/**
 * Sets a worker's status to OFFLINE or AVAILABLE. Workers can never set
 * BUSY directly — that transition is driven by the order lifecycle.
 * RLS additionally enforces that a worker can only update their own row.
 */
export async function setWorkerManualStatus(
  authUserId: string,
  status: WorkerManualStatus,
): Promise<UpdateStatusResult> {
  const parsed = workerManualStatusSchema.safeParse(status);
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, status")
    .eq("auth_user_id", authUserId)
    .single();

  if (!worker) return { error: "Worker profile not found." };

  if (worker.status === "BUSY") {
    return { error: "Cannot change status while a job is in progress." };
  }

  const { error } = await supabase
    .from("workers")
    .update({ status: parsed.data })
    .eq("id", worker.id);

  if (error) return { error: "Failed to update status." };

  return { error: null };
}
