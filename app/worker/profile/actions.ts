"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setWorkerManualStatus } from "@/lib/workers/status";
import { uploadWorkerPhoto } from "@/lib/workers/photo";

export type ActionState = { error: string | null };

async function requireAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

export async function updateStatus(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authUserId = await requireAuthUserId();
  const status = formData.get("status");

  if (status !== "OFFLINE" && status !== "AVAILABLE") {
    return { error: "Invalid status." };
  }

  const result = await setWorkerManualStatus(authUserId, status);
  if (!result.error) revalidatePath("/worker/profile");
  return result;
}

export async function updatePhoto(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authUserId = await requireAuthUserId();
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }

  const result = await uploadWorkerPhoto(authUserId, file);
  if (!result.error) revalidatePath("/worker/profile");
  return { error: result.error };
}
