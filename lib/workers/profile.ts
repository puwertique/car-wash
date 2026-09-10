import { createClient } from "@/lib/supabase/server";

export type WorkerProfile = {
  id: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePhotoUrl: string | null;
  city: string | null;
  serviceArea: string | null;
  status: "OFFLINE" | "AVAILABLE" | "BUSY";
  vehicle: {
    id: string;
    type: string;
    brand: string | null;
    model: string | null;
    registrationNumber: string | null;
    photoUrl: string | null;
  } | null;
};

/**
 * Loads the worker profile (+ assigned vehicle) for the given auth user.
 * Returns null if the user has no worker row.
 */
export async function getWorkerProfileByAuthUserId(
  authUserId: string,
): Promise<WorkerProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workers")
    .select(
      "id, auth_user_id, first_name, last_name, phone, profile_photo_url, city, service_area, status, vehicles(id, type, brand, model, registration_number, photo_url)",
    )
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !data) return null;

  const vehicle = Array.isArray(data.vehicles) ? data.vehicles[0] : data.vehicles;

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    phone: data.phone,
    profilePhotoUrl: data.profile_photo_url,
    city: data.city,
    serviceArea: data.service_area,
    status: data.status,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          type: vehicle.type,
          brand: vehicle.brand,
          model: vehicle.model,
          registrationNumber: vehicle.registration_number,
          photoUrl: vehicle.photo_url,
        }
      : null,
  };
}
