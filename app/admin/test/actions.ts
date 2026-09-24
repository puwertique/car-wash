"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/session";
import { createOrderSchema } from "@/lib/validation/orders";
import { createOrder } from "@/lib/orders/create";
import { registerWorkerSchema } from "@/lib/validation/register-worker";
import { registerWorker } from "@/lib/admin/register-worker";

export type ActionState = { error: string | null; success?: string | null };

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
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone: formData.get("phone"),
    address_text: formData.get("address_text"),
    city: formData.get("city"),
    latitude: Number(formData.get("latitude")), longitude: Number(formData.get("longitude")),
    vehicle_category: formData.get("vehicle_category"),
    vehicle_size: formData.get("vehicle_size") || undefined,
    package_id: formData.get("package_id"),
    source: "referral",
    marketing_consent: true,
    requested_date: formData.get("requested_date"),
    requested_time_slot: formData.get("requested_time_slot"),
    add_ons: [],
    is_asap: false,
    recurrence: "none",
    payment_method: "cash",
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid input — check all required fields." };
  }

  const result = await createOrder(parsed.data);
  if (result.error) return { error: result.error.message };

  revalidatePath("/admin/orders");
  return { error: null };
}

export async function registerWorkerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const fileValue = (name: string) => {
    const value = formData.get(name);
    if (!value || typeof value !== "object") return undefined;
    const candidate = value as { size?: unknown; arrayBuffer?: unknown };
    return typeof candidate.size === "number" && candidate.size > 0 && typeof candidate.arrayBuffer === "function" ? value as File : undefined;
  };

  const parsed = registerWorkerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    compensation_model: formData.get("compensation_model"),
    compensation_value: formData.get("compensation_value"),
    work_vehicle_type: formData.get("work_vehicle_type"),
    vehicle_plate_number: formData.get("vehicle_plate_number"),
    cin_number: formData.get("cin_number") || undefined,
    full_address: formData.get("full_address") || undefined,
    birth_date: formData.get("birth_date") || undefined,
    eligible_package_ids: String(formData.get("eligible_package_ids") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    vehicle_photo: fileValue("vehicle_photo"),
    carte_grise_photo: fileValue("carte_grise_photo"),
    cin_photo: fileValue("cin_photo"),
    portrait: fileValue("portrait"),
    employment_contract: fileValue("employment_contract"),
    insurance_photo: fileValue("insurance_photo"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".") || "form";
    return { error: `Invalid ${field} — ${issue?.message ?? "check the submitted values and documents."}`, success: null };
  }

  const result = await registerWorker(parsed.data);
  if (result.error) return { error: result.error, success: null };

  revalidatePath("/admin/workers");
  return { error: null, success: "Worker registered successfully." };
}
