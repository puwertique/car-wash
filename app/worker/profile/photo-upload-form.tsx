"use client";

import { useActionState } from "react";
import { updatePhoto, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function PhotoUploadForm() {
  const [state, formAction, pending] = useActionState(updatePhoto, initialState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        required
        className="text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-black/20 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload photo"}
      </button>
      {state.error && (
        <span className="text-sm text-red-600" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
