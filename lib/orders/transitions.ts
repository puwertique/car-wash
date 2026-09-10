import { createClient } from "@/lib/supabase/server";

export type TransitionableStatus = "ON_THE_WAY" | "ARRIVED" | "WASHING" | "COMPLETED";

const REQUIRED_CURRENT_STATUS: Record<TransitionableStatus, string> = {
  ON_THE_WAY: "ACCEPTED",
  ARRIVED: "ON_THE_WAY",
  WASHING: "ARRIVED",
  COMPLETED: "WASHING",
};

const EVENT_FOR_STATUS: Record<TransitionableStatus, string> = {
  ON_THE_WAY: "WORKER_ON_THE_WAY",
  ARRIVED: "WORKER_ARRIVED",
  WASHING: "WASH_STARTED",
  COMPLETED: "WASH_COMPLETED",
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

  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", orderId)
    .eq("worker_id", worker.id)
    .eq("status", requiredCurrent)
    .select()
    .single();

  if (error || !order) return { error: "Invalid transition or order not found." };

  await supabase.from("order_events").insert({
    order_id: orderId,
    worker_id: worker.id,
    event_type: EVENT_FOR_STATUS[nextStatus],
  });

  if (nextStatus === "COMPLETED") {
    await supabase.from("workers").update({ status: "AVAILABLE" }).eq("id", worker.id);
  }

  return { error: null };
}
