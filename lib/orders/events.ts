import { createAdminClient } from "@/lib/supabase/admin";

export type OrderEventType =
  | "ORDER_CREATED"
  | "SEARCH_STARTED"
  | "WORKER_OFFERED"
  | "WORKER_ACCEPTED"
  | "WORKER_REJECTED"
  | "WORKER_OFFER_TIMEOUT"
  | "WORKER_ASSIGNED"
  | "WORKER_ON_THE_WAY"
  | "WORKER_ARRIVED"
  | "WASH_STARTED"
  | "WASH_COMPLETED"
  | "ORDER_CANCELLED";

/**
 * Records a system-generated order event using the service-role client.
 * Worker-initiated events are inserted directly by the caller using the
 * user's own session (RLS allows workers to log events on their orders).
 */
export async function recordSystemOrderEvent(
  bookingId: string,
  eventType: OrderEventType,
  metadata?: Record<string, unknown>,
  workerId?: string | null,
) {
  const admin = createAdminClient();
  const statusByEvent: Partial<Record<OrderEventType, string>> = {
    SEARCH_STARTED: "SEARCHING_WORKER",
    WORKER_OFFERED: "OFFERED",
    WORKER_ACCEPTED: "ACCEPTED",
    WORKER_REJECTED: "rejected",
    WORKER_ON_THE_WAY: "ON_THE_WAY",
    WORKER_ARRIVED: "ARRIVED",
    WASH_STARTED: "WASHING",
    WASH_COMPLETED: "COMPLETED",
  };
  const status = statusByEvent[eventType];
  if (!status) return;
  await admin.from("booking_assignments").insert({
    booking_id: bookingId,
    worker_id: workerId ?? null,
    status,
    offer_expires_at: typeof metadata?.expires_at === "string" ? metadata.expires_at : null,
  });
}
