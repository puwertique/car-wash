"use client";

import { useActionState } from "react";
import { addCoveredCity, renameCoveredCity, toggleCoveredCity, type CityActionState } from "./cities-actions";

const initialState: CityActionState = { error: null, success: null };

export function CitiesSection({ cities }: { cities: { id: string; is_active: boolean }[] }) {
  const [state, formAction, pending] = useActionState(addCoveredCity, initialState);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="mb-1 font-medium">Covered cities</h2>
        <p className="text-xs text-black/60">Only active cities appear in worker registration and booking validation.</p>
      </div>
      <form action={formAction} className="flex max-w-lg gap-2">
        <input name="city" placeholder="City slug, e.g. rabat" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="min-w-0 flex-1 rounded border border-black/20 px-2 py-1.5 text-sm" />
        <button type="submit" disabled={pending} className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50">{pending ? "Adding..." : "Add city"}</button>
      </form>
      {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700" role="status">{state.success}</p>}
      <ul className="max-w-lg divide-y divide-black/10 rounded border border-black/10 text-sm">
        {cities.map((city) => <CityRow key={city.id} city={city} />)}
      </ul>
    </section>
  );
}

function CityRow({ city }: { city: { id: string; is_active: boolean } }) {
  const [, formAction, pending] = useActionState(toggleCoveredCity, initialState);
  const [, renameAction, renaming] = useActionState(renameCoveredCity, initialState);
  return (
    <li className="space-y-2 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span>{city.id}</span>
        <div className="flex gap-3">
          <form action={formAction}>
            <input type="hidden" name="city" value={city.id} />
            <input type="hidden" name="is_active" value={String(city.is_active)} />
            <button type="submit" disabled={pending} className="text-sm underline disabled:opacity-50">{city.is_active ? "Disable" : "Enable"}</button>
          </form>
        </div>
      </div>
      <form action={renameAction} className="flex gap-2">
        <input type="hidden" name="current_city" value={city.id} />
        <input name="new_city" defaultValue={city.id} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required className="min-w-0 flex-1 rounded border border-black/20 px-2 py-1 text-xs" />
        <button type="submit" disabled={renaming} className="text-xs underline disabled:opacity-50">{renaming ? "Saving..." : "Edit"}</button>
      </form>
    </li>
  );
}
