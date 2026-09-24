import { createClient } from "@/lib/supabase/server";

export type TransitionableStatus = "ON_THE_WAY" | "ARRIVED" | "WASHING" | "COMPLETED";

const REQUIRED_CURRENT_STATUS: Record<TransitionableStatus, string> = {
  ON_THE_WAY: "ACCEPTED",
  ARRIVED: "ON_THE_WAY",
  WASHING: "ARRIVED",
  COMPLETED: "WASHING",
};

export type TransitionResult = { error: string | null };

/**
 * Advances a worker's own assigned order through the fixed lifecycle
 * ACCEPTED → ON_THE_WAY → ARRIVED → WASHING → COMPLETED. Each step is
 * an atomic conditional update guarded by the required current status,
 * so a stale/duplicate request can't apply the same transition twice
 * or skip a step. On COMPLETED, the worker is set back to AVAILABLE.
 */
export async function transitionOrder(
  authUserId: string,
  orderId: string,
  nextStatus: TransitionableStatus,
): Promise<TransitionResult> {
  const requiredCurrent = REQUIRED_CURRENT_STATUS[nextStatus];
  if (!requiredCurrent) return { error: "Invalid status transition." };

  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (!worker) return { error: "Worker profile not found." };

  const timestampField =
    nextStatus === "ARRIVED" ? "arrived_at" :
    nextStatus === "WASHING" ? "started_at" :
    nextStatus === "COMPLETED" ? "completed_at" : null;

  const updatePayload: Record<string, unknown> = { status: nextStatus };
  if (timestampField) updatePayload[timestampField] = new Date().toISOString();

  const { data: order, error } = await supabase
    .from("booking_assignments")
    .update(updatePayload)
    .eq("booking_id", orderId)
    .eq("worker_id", worker.id)
    .eq("status", requiredCurrent)
    .select()
    .single();

  if (error || !order) return { error: "Invalid transition or order not found." };

  await supabase.from("bookings").update({ status: nextStatus === "COMPLETED" ? "completed" : "in_progress" }).eq("id", orderId);

  if (nextStatus === "COMPLETED") {
    const { data: activeAssignments } = await supabase
      .from("booking_assignments")
      .select("id")
      .eq("worker_id", worker.id)
      .in("status", ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "WASHING"]);

    if ((activeAssignments ?? []).length === 0) {
      await supabase.from("workers").update({ status: "AVAILABLE" }).eq("id", worker.id);
    }
  }

  return { error: null };
}
