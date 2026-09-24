"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createWorkerDirectBooking } from "@/lib/workers/direct-booking";
import { workerDirectBookingSchema } from "@/lib/validation/worker-direct-booking";

export type DirectBookingActionState = { error: string | null; success: string | null };

export async function createDirectBooking(_previous: DirectBookingActionState, formData: FormData): Promise<DirectBookingActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", success: null };

  const parsed = workerDirectBookingSchema.safeParse({
    customer_name: formData.get("customer_name"),
    customer_phone: formData.get("customer_phone"),
    package_id: formData.get("package_id"),
    vehicle_size: formData.get("vehicle_size"),
    payment_method: formData.get("payment_method"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check all required fields.", success: null };

  const result = await createWorkerDirectBooking(user.id, parsed.data);
  if (result.error) return { error: result.error, success: null };
  revalidatePath("/worker/dashboard");
  return { error: null, success: `Booking ${result.bookingNumber} created. Total: ${result.price} MAD.` };
}
