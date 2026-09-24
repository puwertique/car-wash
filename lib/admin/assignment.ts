import { createAdminClient } from "@/lib/supabase/admin";

export type AssignmentCandidate = {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  status: "AVAILABLE" | "BUSY";
  distanceMeters: number | null;
  locationUpdatedAt: string | null;
  notCertified: boolean;
  hasPendingOrActiveJob: boolean;
};

function haversine(firstLatitude: number, firstLongitude: number, secondLatitude: number, secondLongitude: number) {
  const earthRadius = 6371000;
  const latitudeDelta = ((secondLatitude - firstLatitude) * Math.PI) / 180;
  const longitudeDelta = ((secondLongitude - firstLongitude) * Math.PI) / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos((firstLatitude * Math.PI) / 180) * Math.cos((secondLatitude * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function listAssignmentCandidates(bookingId: string): Promise<{ city: string; currentWorkerId: string | null; candidates: AssignmentCandidate[] } | null> {
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("city, package_id, latitude, longitude").eq("id", bookingId).maybeSingle();
  if (!booking) return null;
  const { data: currentAssignment } = await admin.from("booking_assignments").select("worker_id").eq("booking_id", bookingId).in("status", ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "WASHING"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: workers } = await admin.from("workers").select("id, first_name, last_name, status, employment_status, profile_photo_url, eligible_package_ids, worker_current_locations(latitude, longitude, updated_at), booking_assignments(status)").eq("city", booking.city).eq("employment_status", "active").in("status", ["AVAILABLE", "BUSY"]);
  const candidates = (workers ?? []).map((worker) => {
    const location = Array.isArray(worker.worker_current_locations) ? worker.worker_current_locations[0] : worker.worker_current_locations;
    const hasPendingOrActiveJob = Array.isArray(worker.booking_assignments) && worker.booking_assignments.some((assignment) => ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "WASHING"].includes(assignment.status));
    return {
      id: worker.id,
      name: `${worker.first_name} ${worker.last_name}`,
      profilePhotoUrl: worker.profile_photo_url,
      status: worker.status as "AVAILABLE" | "BUSY",
      distanceMeters: location ? haversine(booking.latitude, booking.longitude, location.latitude, location.longitude) : null,
      locationUpdatedAt: location?.updated_at ?? null,
      notCertified: Array.isArray(worker.eligible_package_ids) && worker.eligible_package_ids.length > 0 && !worker.eligible_package_ids.includes(booking.package_id),
      hasPendingOrActiveJob,
    };
  }).sort((first, second) => {
    const statusRank = (status: string) => status === "AVAILABLE" ? 0 : 1;
    const firstStatus = statusRank(first.status) - statusRank(second.status);
    if (firstStatus) return firstStatus;
    if (first.distanceMeters == null) return second.distanceMeters == null ? 0 : 1;
    if (second.distanceMeters == null) return -1;
    return first.distanceMeters - second.distanceMeters;
  });
  return { city: booking.city, currentWorkerId: currentAssignment?.worker_id ?? null, candidates };
}