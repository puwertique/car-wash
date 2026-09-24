import { createClient } from "@/lib/supabase/server";
import type { WorkerDirectBookingInput } from "@/lib/validation/worker-direct-booking";

export type DirectBookingResult = { error: string | null; bookingId?: string; bookingNumber?: string; price?: number };

export async function createWorkerDirectBooking(authUserId: string, input: WorkerDirectBookingInput): Promise<DirectBookingResult> {
  const supabase = await createClient();
  const { data: worker } = await supabase.from("workers").select("id, city, employment_status").eq("auth_user_id", authUserId).single();
  if (!worker || worker.employment_status !== "active") return { error: "Only active workers can create direct bookings." };

  const { data: location } = await supabase.from("worker_current_locations").select("latitude, longitude").eq("worker_id", worker.id).maybeSingle();
  if (!location) return { error: "A current GPS location is required to create a direct booking." };

  const { data, error } = await supabase.rpc("create_worker_direct_booking_atomic", {
    p_worker_id: worker.id,
    p_customer_name: input.customer_name,
    p_customer_phone: input.customer_phone,
    p_package_id: input.package_id,
    p_vehicle_size: input.vehicle_size,
    p_payment_method: input.payment_method,
    p_latitude: location.latitude,
    p_longitude: location.longitude,
    p_city: worker.city,
  });
  if (error || !data?.[0]) {
    if (error?.message.includes("PACKAGE_NOT_FOUND")) return { error: "The selected package is not active or does not match the vehicle size." };
    return { error: "Unable to create direct booking." };
  }
  return { error: null, bookingId: data[0].id, bookingNumber: data[0].booking_id, price: Number(data[0].price_snapshot) };
}
