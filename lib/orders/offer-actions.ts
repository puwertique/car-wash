import { createClient } from "@/lib/supabase/server";
import { offerNextWorker } from "@/lib/dispatch/offer";

export type OfferActionResult = { error: string | null };

async function getOwnWorkerId(authUserId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workers")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();
  return data?.id ?? null;
}

/**
 * Worker accepts their current offer. Atomic conditional update — only
 * succeeds if the order is still OFFERED and assigned to this worker,
 * preventing double acceptance / accepting an expired offer.
 */
export async function acceptOffer(
  authUserId: string,
  orderId: string,
): Promise<OfferActionResult> {
  const supabase = await createClient();
  const workerId = await getOwnWorkerId(authUserId);
  if (!workerId) return { error: "Worker profile not found." };

  const nowIso = new Date().toISOString();

  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: "ACCEPTED", offer_expires_at: null })
    .eq("id", orderId)
    .eq("worker_id", workerId)
    .eq("status", "OFFERED")
    .gt("offer_expires_at", nowIso)
    .select()
    .single();

  if (error || !order) return { error: "This offer is no longer available." };

  await supabase.from("order_events").insert({
    order_id: orderId,
    worker_id: workerId,
    event_type: "WORKER_ACCEPTED",
  });

  await supabase.from("workers").update({ status: "BUSY" }).eq("id", workerId);

  return { error: null };
}

/**
 * Worker rejects their current offer. Releases the order back to
 * SEARCHING_WORKER and immediately offers it to the next eligible
 * worker (excluding this one).
 */
export async function rejectOffer(
  authUserId: string,
  orderId: string,
): Promise<OfferActionResult> {
  const supabase = await createClient();
  const workerId = await getOwnWorkerId(authUserId);
  if (!workerId) return { error: "Worker profile not found." };

  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: "SEARCHING_WORKER", worker_id: null, offer_expires_at: null })
    .eq("id", orderId)
    .eq("worker_id", workerId)
    .eq("status", "OFFERED")
    .select()
    .single();

  if (error || !order) return { error: "This offer is no longer active." };

  await supabase.from("order_events").insert({
    order_id: orderId,
    worker_id: workerId,
    event_type: "WORKER_REJECTED",
  });

  await offerNextWorker(orderId);

  return { error: null };
}
