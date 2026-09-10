import { createClient } from "@/lib/supabase/server";

export type OrderPhotoKind = "before" | "after";

export type UploadOrderPhotoResult = { error: string | null };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Uploads a before/after photo for an order the caller is assigned to.
 * Storage RLS additionally enforces the assigned-worker restriction.
 */
export async function uploadOrderPhoto(
  authUserId: string,
  orderId: string,
  kind: OrderPhotoKind,
  file: File,
): Promise<UploadOrderPhotoResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Photo must be a JPEG, PNG, or WebP image." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Photo must be smaller than 5MB." };
  }

  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (!worker) return { error: "Worker profile not found." };

  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("worker_id", worker.id)
    .single();

  if (!order) return { error: "Order not found or not assigned to you." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${orderId}/${kind}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("order-photos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: "Failed to upload photo." };

  const { data: publicUrlData } = supabase.storage.from("order-photos").getPublicUrl(path);

  const column = kind === "before" ? "before_photo_url" : "after_photo_url";
  const { error: updateError } = await supabase
    .from("orders")
    .update({ [column]: publicUrlData.publicUrl })
    .eq("id", orderId);

  if (updateError) return { error: "Failed to save photo." };

  return { error: null };
}
