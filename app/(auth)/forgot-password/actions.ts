"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { allowPasswordResetRequest } from "@/lib/auth/password-rate-limit";
import { forgotPasswordSchema, type PasswordActionState } from "@/lib/validation/password";

export async function requestPasswordReset(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address.", success: null };

  const email = parsed.data.email.toLowerCase();
  if (allowPasswordResetRequest(email)) {
    const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
  }

  return { error: null, success: "If an account exists for this email, you will receive a password reset link." };
}
