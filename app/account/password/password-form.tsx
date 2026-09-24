"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePassword } from "./actions";
import type { PasswordActionState } from "@/lib/validation/password";

const initialState: PasswordActionState = { error: null, success: null };

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={formAction} className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 p-6">
        <h1 className="text-xl font-semibold">Change password</h1>
        <label htmlFor="current_password" className="block text-sm font-medium">Current password</label>
        <input id="current_password" name="current_password" type="password" minLength={6} required autoComplete="current-password" className="w-full rounded border border-black/20 px-3 py-2" />
        <label htmlFor="password" className="block text-sm font-medium">New password</label>
        <input id="password" name="password" type="password" minLength={6} required autoComplete="new-password" className="w-full rounded border border-black/20 px-3 py-2" />
        <label htmlFor="confirm_password" className="block text-sm font-medium">Confirm new password</label>
        <input id="confirm_password" name="confirm_password" type="password" minLength={6} required autoComplete="new-password" className="w-full rounded border border-black/20 px-3 py-2" />
        {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
        <button type="submit" disabled={pending} className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50">{pending ? "Updating..." : "Change password"}</button>
        <Link href="/login" className="block text-center text-sm underline">Back to sign in</Link>
      </form>
    </main>
  );
}