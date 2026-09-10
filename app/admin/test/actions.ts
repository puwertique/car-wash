"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/session";
import { createOrderSchema } from "@/lib/validation/orders";
import { createOrder } from "@/lib/orders/create";
import { registerWorkerSchema } from "@/lib/validation/register-worker";
import { registerWorker } from "@/lib/admin/register-worker";

export type ActionState = { error: string | null };

async function requireAdmin() {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
    throw new Error("Not authorized.");
  }
}

export async function createTestOrder(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = createOrderSchema.safeParse({
    customer_name: formData.get("customer_name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    city: formData.get("city"),
    latitude: Number(formData.get("latitude")),
    longitude: Number(formData.get("longitude")),
    vehicle_type: formData.get("vehicle_type") || undefined,
    vehicle_size: formData.get("vehicle_size") || undefined,
    package_type: formData.get("package_type") || undefined,
    service_id: formData.get("service_id"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid input — check all required fields." };
  }

  const result = await createOrder(parsed.data);
  if (result.error) return { error: result.error };

  revalidatePath("/admin/orders");
  return { error: null };
}

export async function registerWorkerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = registerWorkerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone: formData.get("phone"),
    city: formData.get("city") || undefined,
    service_area: formData.get("service_area") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid input — check all required fields (password min 6 chars)." };
  }

  const result = await registerWorker(parsed.data);
  if (result.error) return { error: result.error };

  revalidatePath("/admin/workers");
  return { error: null };
}
