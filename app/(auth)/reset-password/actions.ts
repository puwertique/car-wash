"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema, type PasswordActionState } from "@/lib/validation/password";

export async function resetPassword(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your password.", success: null };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "This reset link has expired or is invalid. Request a new link.", success: null };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "We could not update your password. Request a new link and try again.", success: null };
  redirect("/login?password_reset=success");
}
