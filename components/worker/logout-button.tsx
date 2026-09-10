"use client";

import { logout } from "@/app/(auth)/login/actions";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => logout()}
      className="rounded border border-black/20 px-3 py-1.5 text-sm"
    >
      Log out
    </button>
  );
}
