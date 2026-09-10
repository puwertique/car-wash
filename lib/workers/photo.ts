import { createClient } from "@/lib/supabase/server";

export type UploadPhotoResult =
  | { error: string; url?: undefined }
  | { error: null; url: string };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Uploads a worker's profile photo to the `worker-photos` bucket at
 * `<worker_id>/photo.<ext>` (fixed name so re-uploads overwrite) and
 * persists the public URL on the worker row.
 */
export async function uploadWorkerPhoto(
  authUserId: string,
  file: File,
): Promise<UploadPhotoResult> {
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

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${worker.id}/photo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("worker-photos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: "Failed to upload photo." };

  const { data: publicUrlData } = supabase.storage
    .from("worker-photos")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("workers")
    .update({ profile_photo_url: publicUrlData.publicUrl })
    .eq("id", worker.id);

  if (updateError) return { error: "Failed to save photo." };

  return { error: null, url: publicUrlData.publicUrl };
}
