"use client";

import { useActionState } from "react";
import { createTestOrder, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function CreateTestOrderForm({
  services,
}: {
  services: { id: string; name: string; price: number }[];
}) {
  const [state, formAction, pending] = useActionState(createTestOrder, initialState);

  return (
    <form action={formAction} className="grid max-w-lg grid-cols-2 gap-3">
      <input name="customer_name" placeholder="Customer name" required className="col-span-2 rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="phone" placeholder="Phone" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <select name="service_id" required className="rounded border border-black/20 px-2 py-1.5 text-sm">
        <option value="">Service…</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.price} MAD)
          </option>
        ))}
      </select>
      <input name="address" placeholder="Address" required className="col-span-2 rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="city" placeholder="City" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="package_type" placeholder="Package type (optional)" className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="latitude" type="number" step="any" placeholder="Latitude" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="longitude" type="number" step="any" placeholder="Longitude" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="vehicle_type" placeholder="Vehicle type (optional)" className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="vehicle_size" placeholder="Vehicle size (optional)" className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="notes" placeholder="Notes (optional)" className="col-span-2 rounded border border-black/20 px-2 py-1.5 text-sm" />

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
        {pending ? "Creating…" : "Create test order"}
      </button>
    </form>
  );
}
