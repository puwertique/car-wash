"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transitionOrder, type TransitionableStatus } from "@/lib/orders/transitions";
import { uploadOrderPhoto, type OrderPhotoKind } from "@/lib/orders/photo";

export type ActionResult = { error: string | null };

async function requireAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

export async function acceptAssignment(orderId: string): Promise<ActionResult> {
  const authUserId = await requireAuthUserId();
  const supabase = await createClient();
  const { data: worker } = await supabase.from("workers").select("id").eq("auth_user_id", authUserId).single();
  if (!worker) return { error: "Worker profile not found." };

  const { error } = await supabase
    .from("booking_assignments")
    .update({ status: "ACCEPTED", accepted_at: new Date().toISOString() })
    .eq("booking_id", orderId)
    .eq("worker_id", worker.id)
    .eq("status", "ASSIGNED_PENDING_ACCEPTANCE");

  if (error) return { error: "Unable to accept this assignment." };
  await supabase.from("workers").update({ status: "BUSY" }).eq("id", worker.id);
  revalidatePath("/worker/dashboard");
  return { error: null };
}

export async function advanceOrder(
  orderId: string,
  nextStatus: TransitionableStatus,
): Promise<ActionResult> {
  const authUserId = await requireAuthUserId();
  const result = await transitionOrder(authUserId, orderId, nextStatus);
  revalidatePath("/worker/dashboard");
  return result;
}

export async function uploadOrderPhotoAction(
  orderId: string,
  kind: OrderPhotoKind,
  formData: FormData,
): Promise<ActionResult> {
  const authUserId = await requireAuthUserId();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  const result = await uploadOrderPhoto(authUserId, orderId, kind, file);
  revalidatePath("/worker/dashboard");
  return { error: result.error };
}
