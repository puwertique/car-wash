import { createClient } from "@/lib/supabase/server";

export type AdminWorkerRow = {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  status: string;
  vehicle: string | null;
  lastLocationAt: string | null;
};

export async function listWorkersForAdmin(): Promise<AdminWorkerRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("workers")
    .select(
      "id, first_name, last_name, phone, city, status, vehicles(type, brand, model), worker_current_locations(updated_at)",
    )
    .order("first_name");

  return (data ?? []).map((row) => {
    const vehicle = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles;
    const location = Array.isArray(row.worker_current_locations)
      ? row.worker_current_locations[0]
      : row.worker_current_locations;

    return {
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      phone: row.phone,
      city: row.city,
      status: row.status,
      vehicle: vehicle ? `${vehicle.type} ${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() : null,
      lastLocationAt: location?.updated_at ?? null,
    };
  });
}
