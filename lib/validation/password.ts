import { z } from "zod";

const password = z.string().min(6, "Password must be at least 6 characters.");

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export const resetPasswordSchema = z.object({
  password: password,
  confirm_password: password,
}).refine((values) => values.password === values.confirm_password, {
  message: "Passwords do not match.",
  path: ["confirm_password"],
});

export const updatePasswordSchema = z.object({
  current_password: password,
  password: password,
  confirm_password: password,
}).refine((values) => values.password === values.confirm_password, {
  message: "New passwords do not match.",
  path: ["confirm_password"],
});

export type PasswordActionState = { error: string | null; success: string | null };
