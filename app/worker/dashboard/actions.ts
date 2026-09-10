"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { acceptOffer, rejectOffer } from "@/lib/orders/offer-actions";
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

export async function acceptCurrentOffer(orderId: string): Promise<ActionResult> {
  const authUserId = await requireAuthUserId();
  const result = await acceptOffer(authUserId, orderId);
  revalidatePath("/worker/dashboard");
  return result;
}

export async function rejectCurrentOffer(orderId: string): Promise<ActionResult> {
  const authUserId = await requireAuthUserId();
  const result = await rejectOffer(authUserId, orderId);
  revalidatePath("/worker/dashboard");
  return result;
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
