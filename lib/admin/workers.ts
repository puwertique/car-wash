import { createClient } from "@/lib/supabase/server";

export type AdminWorkerRow = {
  id: string;
  name: string;
  phone: string;
  city: string;
  operationalStatus: string;
  employmentStatus: string;
  profilePhotoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
};

export async function listWorkersForAdmin(): Promise<AdminWorkerRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("workers")
    .select("id, first_name, last_name, phone, city, status, employment_status, profile_photo_url, worker_current_locations(latitude, longitude, updated_at)")
    .order("first_name");

  return (data ?? []).map((row) => {
    const location = Array.isArray(row.worker_current_locations)
      ? row.worker_current_locations[0]
      : row.worker_current_locations;

    return {
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      phone: row.phone,
      city: row.city,
      operationalStatus: row.status,
      employmentStatus: row.employment_status,
      profilePhotoUrl: row.profile_photo_url,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      locationUpdatedAt: location?.updated_at ?? null,
    };
  });
}
