"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";

export type PackageActionState = { error: string | null; success: string | null };

const editableSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  base_price: z.coerce.number().min(0),
  estimated_duration_minutes: z.coerce.number().int().positive(),
});
const structuralSchema = z.object({
  id: z.string().trim().min(1).regex(/^[a-z0-9_]+$/),
  vehicle_category: z.enum(["car", "moto"]),
  vehicle_size: z.enum(["citadine", "berline", "suv_medium", "suv_large", "moto_small", "moto_large"]),
});

async function requireAdmin() {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) throw new Error("Not authorized.");
}

export async function updatePackage(_previous: PackageActionState, formData: FormData): Promise<PackageActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = editableSchema.safeParse({ name: formData.get("name"), description: formData.get("description"), base_price: formData.get("base_price"), estimated_duration_minutes: formData.get("estimated_duration_minutes") });
  if (!parsed.success) return { error: "Invalid editable package fields.", success: null };
  const admin = createAdminClient();
  const { error } = await admin.from("packages").update(parsed.data).eq("id", id);
  if (error) return { error: "Unable to update package.", success: null };
  revalidatePath("/admin/packages");
  revalidatePath("/admin/test");
  revalidatePath("/worker/bookings/new");
  return { error: null, success: "Package updated." };
}

export async function togglePackage(_previous: PackageActionState, formData: FormData): Promise<PackageActionState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const isActive = formData.get("is_active") === "true";
  const admin = createAdminClient();
  const { error } = await admin.from("packages").update({ is_active: !isActive }).eq("id", id);
  if (error) return { error: "Unable to update package status.", success: null };
  revalidatePath("/admin/packages");
  revalidatePath("/admin/test");
  revalidatePath("/worker/bookings/new");
  return { error: null, success: `Package ${!isActive ? "enabled" : "disabled"}.` };
}

export async function createPackage(_previous: PackageActionState, formData: FormData): Promise<PackageActionState> {
  await requireAdmin();
  const structural = structuralSchema.safeParse({ id: formData.get("id"), vehicle_category: formData.get("vehicle_category"), vehicle_size: formData.get("vehicle_size") });
  const editable = editableSchema.safeParse({ name: formData.get("name"), description: formData.get("description"), base_price: formData.get("base_price"), estimated_duration_minutes: formData.get("estimated_duration_minutes") });
  if (!structural.success || !editable.success) return { error: "Invalid package fields.", success: null };
  const admin = createAdminClient();
  const { error } = await admin.from("packages").insert({ ...structural.data, ...editable.data, is_active: false });
  if (error) return { error: "Unable to create package. The package ID may already exist.", success: null };
  revalidatePath("/admin/packages");
  return { error: null, success: "Package created as inactive." };
}
