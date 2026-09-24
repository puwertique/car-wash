"use client";

import { useActionState, useState } from "react";
import { createTestOrder, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

type PackageOption = { id: string; name: string; base_price: number; vehicle_category: string; vehicle_size: string };

export function CreateTestOrderForm({ packages, cities }: { packages: PackageOption[]; cities: string[] }) {
  const [state, formAction, pending] = useActionState(createTestOrder, initialState);
  const [vehicleSize, setVehicleSize] = useState("");
  const filteredPackages = packages.filter((item) => item.vehicle_size === vehicleSize);
  return (
    <form action={formAction} className="grid max-w-lg grid-cols-2 gap-3">
      <input name="full_name" placeholder="Full name" required className="col-span-2 rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="phone_number" placeholder="+212612345678" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <select name="vehicle_category" required className="rounded border border-black/20 px-2 py-1.5 text-sm"><option value="car">Car</option><option value="moto">Moto</option></select>
      <select name="vehicle_size" value={vehicleSize} onChange={(event) => setVehicleSize(event.target.value)} required className="rounded border border-black/20 px-2 py-1.5 text-sm"><option value="">Vehicle size...</option><option value="citadine">Citadine</option><option value="berline">Berline</option><option value="suv_medium">SUV medium</option><option value="suv_large">SUV large</option><option value="moto_small">Moto small</option><option value="moto_large">Moto large</option></select>
      <select name="package_id" required disabled={!vehicleSize} className="rounded border border-black/20 px-2 py-1.5 text-sm"><option value="">{vehicleSize ? "Package..." : "Select vehicle size first..."}</option>{filteredPackages.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.base_price} MAD</option>)}</select>
      <input name="requested_date" type="date" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="requested_time_slot" placeholder="10:00-12:00" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="address_text" placeholder="Address" required className="col-span-2 rounded border border-black/20 px-2 py-1.5 text-sm" />
      <select name="city" required className="rounded border border-black/20 px-2 py-1.5 text-sm"><option value="">City...</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select>
      <input name="latitude" type="number" step="any" placeholder="Latitude" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="longitude" type="number" step="any" placeholder="Longitude" required className="rounded border border-black/20 px-2 py-1.5 text-sm" />
      <input name="notes" placeholder="Notes (optional)" className="col-span-2 rounded border border-black/20 px-2 py-1.5 text-sm" />
      {state.error && <p className="col-span-2 text-sm text-red-600" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="col-span-2 rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50">{pending ? "Creating..." : "Create test booking"}</button>
    </form>
  );
}
