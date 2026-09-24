import { createAdminClient } from "@/lib/supabase/admin";
import { findBestWorkerForOrder } from "@/lib/dispatch/find-worker";
import { recordSystemOrderEvent } from "@/lib/orders/events";

export const OFFER_TIMEOUT_SECONDS = Number(
  process.env.DISPATCH_OFFER_TIMEOUT_SECONDS ?? 30,
);

/**
 * Starts (or resumes) dispatch for a booking: records SEARCHING_WORKER
 * and offers it to the nearest eligible worker, excluding any worker
 * who explicitly rejected this order. A timed-out offer does NOT
 * exclude the worker from future rounds — with a small fleet, the
 * same nearest worker may legitimately be the best (or only) option
 * again later, and permanently blacklisting them would stall the
 * order forever.
 */
export async function dispatchOrder(orderId: string) {
  const admin = createAdminClient();

  await admin.from("bookings").update({ status: "assigned", offer_expires_at: null }).eq("id", orderId).in("status", ["pending", "assigned"]);
  await admin.from("booking_assignments").update({ status: "SEARCHING_WORKER", worker_id: null, offer_expires_at: null }).eq("booking_id", orderId).eq("status", "proposed");

  await recordSystemOrderEvent(orderId, "SEARCH_STARTED");

  return offerNextWorker(orderId);
}

async function getExcludedWorkerIds(orderId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_assignments")
    .select("worker_id")
    .eq("booking_id", orderId)
    .eq("status", "rejected");

  return Array.from(
    new Set((data ?? []).map((row) => row.worker_id).filter((id): id is string => !!id)),
  );
}

/**
 * Offers the order to the next best eligible worker not already
 * offered/rejected. No-op (order stays SEARCHING_WORKER) if none found.
 */
export async function offerNextWorker(orderId: string) {
  const admin = createAdminClient();
  const excludeWorkerIds = await getExcludedWorkerIds(orderId);
  const workerId = await findBestWorkerForOrder(orderId, excludeWorkerIds);

  if (!workerId) {
    return { offered: false as const };
  }

  const expiresAt = new Date(
    Date.now() + OFFER_TIMEOUT_SECONDS * 1000,
  ).toISOString();

  const { data } = await admin
    .from("booking_assignments")
    .insert({ booking_id: orderId, status: "OFFERED", worker_id: workerId, offer_expires_at: expiresAt })
    .select()
    .single();

  if (!data) return { offered: false as const };

  await admin.from("bookings").update({ status: "assigned", offer_expires_at: expiresAt }).eq("id", orderId);

  await recordSystemOrderEvent(
    orderId,
    "WORKER_OFFERED",
    { expires_at: expiresAt },
    workerId,
  );

  return { offered: true as const, workerId };
}
