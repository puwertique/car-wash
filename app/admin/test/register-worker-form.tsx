"use client";

import { useActionState } from "react";
import { registerWorkerAction, type ActionState } from "./actions";

const initialState: ActionState = { error: null, success: null };

export function RegisterWorkerForm({ cities }: { cities: string[] }) {
  const [state, formAction, pending] = useActionState(registerWorkerAction, initialState);
  return (
    <form action={formAction} className="grid max-w-2xl grid-cols-2 gap-3">
      <input name="first_name" placeholder="First name" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="last_name" placeholder="Last name" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="phone" placeholder="+212612345678" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <select name="city" required className="rounded border border-black/20 px-2 py-1.5 text-sm"><option value="">City...</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select>
      <input name="email" type="email" placeholder="Login email" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="password" type="password" placeholder="Temporary password (min 6 chars)" required minLength={6} className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <select name="compensation_model" required className="rounded border border-black/20 px-2 py-1.5 text-sm"><option value="">Compensation model...</option><option value="percentage">Percentage</option><option value="fixed_per_booking">Fixed per booking</option><option value="salary">Salary</option></select>
      <input name="compensation_value" type="number" min="0.01" step="0.01" placeholder="Compensation value (MAD or %)" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <select name="work_vehicle_type" required className="rounded border border-black/20 px-2 py-1.5 text-sm"><option value="">Work vehicle type...</option><option value="tricycle_motorcycle">Tricycle motorcycle</option><option value="van">Van</option></select>
      <input name="vehicle_plate_number" placeholder="Vehicle plate number" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="cin_number" placeholder="CIN (optional)" className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="birth_date" type="date" className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="full_address" placeholder="Full address (optional)" className="col-span-2 rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="eligible_package_ids" placeholder="Eligible package UUIDs (optional, comma-separated)" className="col-span-2 rounded border border-black/20 px-2 py-1.5 text-sm" />
      <label className="text-sm">Vehicle photo (required)<input name="vehicle_photo" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-xs" /></label>
      <label className="text-sm">Carte grise photo (required)<input name="carte_grise_photo" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-xs" /></label>
      <label className="text-sm">CIN photo (optional)<input name="cin_photo" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" /></label>
      <label className="text-sm">Worker portrait (optional)<input name="portrait" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" /></label>
      <label className="text-sm">Employment contract (optional)<input name="employment_contract" type="file" accept="application/pdf" className="mt-1 block w-full text-xs" /></label>
      <label className="text-sm">Insurance photo (optional)<input name="insurance_photo" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" /></label>
      {state.error && <p className="col-span-2 text-sm text-red-600" role="alert">{state.error}</p>}
      {state.success && <p className="col-span-2 text-sm text-green-700" role="status">{state.success}</p>}
      <button type="submit" disabled={pending} className="col-span-2 rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50">{pending ? "Registering..." : "Register worker"}</button>
    </form>
  );
}
