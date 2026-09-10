"use client";

import { useActionState } from "react";
import { updateStatus, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function StatusToggle({
  status,
}: {
  status: "OFFLINE" | "AVAILABLE" | "BUSY";
}) {
  const [state, formAction, pending] = useActionState(updateStatus, initialState);

  if (status === "BUSY") {
    return (
      <p className="text-sm text-black/60">
        Status: <span className="font-medium">BUSY</span> — locked while a
        job is in progress.
      </p>
    );
  }

  const nextStatus = status === "AVAILABLE" ? "OFFLINE" : "AVAILABLE";

  return (
    <form action={formAction} className="flex items-center gap-3">
      <p className="text-sm">
        Status: <span className="font-medium">{status}</span>
      </p>
      <input type="hidden" name="status" value={nextStatus} />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/20 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {pending ? "Updating…" : `Set ${nextStatus}`}
      </button>
      {state.error && (
        <span className="text-sm text-red-600" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
