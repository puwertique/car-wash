"use client";

import { useActionState } from "react";
import { registerWorkerAction, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function RegisterWorkerForm() {
  const [state, formAction, pending] = useActionState(registerWorkerAction, initialState);

  return (
    <form action={formAction} className="grid max-w-lg grid-cols-2 gap-3">
      <input name="first_name" placeholder="First name" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="last_name" placeholder="Last name" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="phone" placeholder="Phone" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="city" placeholder="City (optional)" className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="service_area" placeholder="Service area (optional)" className="col-span-2 rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="email" type="email" placeholder="Login email" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="password" type="password" placeholder="Temporary password (min 6 chars)" required minLength={6} className="rounded border border-black/20 px-2 py-1.5 text-sm" />

      {state.error && (
        <p className="col-span-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Registering…" : "Register worker"}
      </button>
    </form>
  );
}
