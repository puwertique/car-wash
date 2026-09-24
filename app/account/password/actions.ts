"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePasswordSchema, type PasswordActionState } from "@/lib/validation/password";

export async function updatePassword(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const parsed = updatePasswordSchema.safeParse({
    current_password: formData.get("current_password"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your passwords.", success: null };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Your session is invalid. Sign in again.", success: null };

  const { error: verificationError } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.current_password });
  if (verificationError) return { error: "The current password is incorrect.", success: null };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "We could not update your password. Try again.", success: null };
  redirect("/account/password?updated=success");
}
