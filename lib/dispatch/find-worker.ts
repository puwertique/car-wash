import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_RADIUS_METERS = Number(
  process.env.DISPATCH_SEARCH_RADIUS_METERS ?? 15_000,
);

/**
 * Finds the nearest AVAILABLE worker with a fresh GPS fix within range,
 * excluding any worker ids already offered/rejected for this order.
 * Uses the PostGIS RPC `find_available_workers_near_location`.
 */
export async function findBestWorkerForOrder(
  orderId: string,
  excludeWorkerIds: string[] = [],
): Promise<string | null> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("latitude, longitude")
    .eq("id", orderId)
    .single();

  if (!order) return null;

  const { data: candidates, error } = await admin.rpc(
    "find_available_workers_near_location",
    {
      p_lat: order.latitude,
      p_lng: order.longitude,
      p_radius_meters: DEFAULT_RADIUS_METERS,
      p_exclude_worker_ids: excludeWorkerIds,
    },
  );

  if (error || !candidates || candidates.length === 0) return null;

  return candidates[0].worker_id as string;
}
