import { createAdminClient } from "@/lib/supabase/admin";
import { offerNextWorker } from "@/lib/dispatch/offer";
import { recordSystemOrderEvent } from "@/lib/orders/events";

/**
 * Progresses dispatch without a background job runner: called via
 * polling (worker dashboard / admin console). Idempotent — safe to
 * call repeatedly and from multiple clients at once.
 *
 * 1. Expired OFFERED orders → WORKER_OFFER_TIMEOUT → offer next worker.
 * 2. Orders stuck in SEARCHING_WORKER (no eligible worker last time) →
 *    retry in case a worker has since become available.
 */
export async function runDispatchSweep() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: expiredOffers } = await admin
    .from("booking_assignments")
    .select("id, booking_id, worker_id")
    .eq("status", "OFFERED")
    .lt("offer_expires_at", nowIso);

  for (const order of expiredOffers ?? []) {
    const { data: reclaimed } = await admin
      .from("booking_assignments")
      .update({ status: "SEARCHING_WORKER", worker_id: null, offer_expires_at: null })
      .eq("id", order.id)
      .eq("status", "OFFERED")
      .lt("offer_expires_at", nowIso)
      .select()
      .single();

    if (!reclaimed) continue;

    await recordSystemOrderEvent(order.booking_id, "WORKER_OFFER_TIMEOUT", undefined, order.worker_id);
    await offerNextWorker(order.booking_id);
  }

  const { data: stuckOrders } = await admin
    .from("booking_assignments")
    .select("booking_id")
    .eq("status", "SEARCHING_WORKER");

  for (const order of stuckOrders ?? []) {
    await offerNextWorker(order.booking_id);
  }
}
