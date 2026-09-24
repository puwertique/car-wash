"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "./actions";
import type { PasswordActionState } from "@/lib/validation/password";

const initialState: PasswordActionState = { error: null, success: null };

export function ResetForm() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 p-6">
      <h1 className="text-xl font-semibold">Reset password</h1>
      <label htmlFor="password" className="block text-sm font-medium">New password</label>
      <input id="password" name="password" type="password" minLength={6} required autoComplete="new-password" className="w-full rounded border border-black/20 px-3 py-2" />
      <label htmlFor="confirm_password" className="block text-sm font-medium">Confirm password</label>
      <input id="confirm_password" name="confirm_password" type="password" minLength={6} required autoComplete="new-password" className="w-full rounded border border-black/20 px-3 py-2" />
      {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50">{pending ? "Updating..." : "Update password"}</button>
      <Link href="/forgot-password" className="block text-center text-sm underline">Request a new link</Link>
    </form>
  );
}
