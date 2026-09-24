"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";

export type CityActionState = { error: string | null; success: string | null };

const citySchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.");

async function requireAdmin() {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) throw new Error("Not authorized.");
}

export async function addCoveredCity(_previousState: CityActionState, formData: FormData): Promise<CityActionState> {
  await requireAdmin();
  const parsed = citySchema.safeParse(formData.get("city"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid city slug.", success: null };

  const admin = createAdminClient();
  const { error } = await admin.from("covered_cities").upsert({ id: parsed.data, is_active: true }, { onConflict: "id" });
  if (error) return { error: "Unable to add this city.", success: null };
  revalidatePath("/admin/test");
  revalidatePath("/admin/cities");
  return { error: null, success: "City added and enabled." };
}

export async function toggleCoveredCity(_previousState: CityActionState, formData: FormData): Promise<CityActionState> {
  await requireAdmin();
  const city = citySchema.safeParse(formData.get("city"));
  const active = formData.get("is_active") === "true";
  if (!city.success) return { error: "Invalid city.", success: null };

  const admin = createAdminClient();
  const { error } = await admin.from("covered_cities").update({ is_active: !active }).eq("id", city.data);
  if (error) return { error: "Unable to update this city.", success: null };
  revalidatePath("/admin/test");
  revalidatePath("/admin/cities");
  return { error: null, success: `City ${!active ? "enabled" : "disabled"}.` };
}

export async function renameCoveredCity(_previousState: CityActionState, formData: FormData): Promise<CityActionState> {
  await requireAdmin();
  const current = citySchema.safeParse(formData.get("current_city"));
  const next = citySchema.safeParse(formData.get("new_city"));
  if (!current.success || !next.success) return { error: "Use a valid city slug.", success: null };
  if (current.data === next.data) return { error: null, success: "No changes were made." };

  const admin = createAdminClient();
  const { error } = await admin.from("covered_cities").update({ id: next.data }).eq("id", current.data);
  if (error) return { error: "Unable to rename this city. The new name may already exist.", success: null };
  revalidatePath("/admin/test");
  revalidatePath("/admin/cities");
  return { error: null, success: "City updated." };
}

