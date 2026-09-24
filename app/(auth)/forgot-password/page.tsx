"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import type { PasswordActionState } from "@/lib/validation/password";

const initialState: PasswordActionState = { error: null, success: null };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={formAction} className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 p-6">
        <h1 className="text-xl font-semibold">Forgot password?</h1>
        <p className="text-sm text-black/60">Enter your email and we will send a reset link if an account exists.</p>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="w-full rounded border border-black/20 px-3 py-2" />
        {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700" role="status">{state.success}</p>}
        <button type="submit" disabled={pending} className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50">{pending ? "Sending..." : "Send reset link"}</button>
        <Link href="/login" className="block text-center text-sm underline">Back to sign in</Link>
      </form>
    </main>
  );
}
