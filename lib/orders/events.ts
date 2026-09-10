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
  orderId: string,
  eventType: OrderEventType,
  metadata?: Record<string, unknown>,
  workerId?: string | null,
) {
  const admin = createAdminClient();
  await admin.from("order_events").insert({
    order_id: orderId,
    worker_id: workerId ?? null,
    event_type: eventType,
    metadata: metadata ?? null,
  });
}
