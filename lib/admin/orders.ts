import { createClient } from "@/lib/supabase/server";

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  city: string;
  packageId: string;
  assignmentId: string | null;
  customerName: string | null;
  workerName: string | null;
  serviceName: string | null;
  createdAt: string;
};

export async function listOrdersForAdmin(): Promise<AdminOrderRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select("id, booking_id, status, city, package_id, created_at, customers(full_name), packages(name), booking_assignments(id, worker_id, status, workers(first_name, last_name))").order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const assignment = Array.isArray(row.booking_assignments) ? row.booking_assignments.find((item) => item.status === "ACCEPTED") ?? row.booking_assignments[0] : row.booking_assignments;
    const worker = assignment?.workers ? (Array.isArray(assignment.workers) ? assignment.workers[0] : assignment.workers) : null;
    const packageRow = Array.isArray(row.packages) ? row.packages[0] : row.packages;
    return {
      id: row.id,
      orderNumber: row.booking_id,
      status: row.status,
      city: row.city,
      packageId: row.package_id,
      assignmentId: assignment?.id ?? null,
      customerName: customer?.full_name ?? null,
      workerName: worker ? `${worker.first_name} ${worker.last_name}` : null,
      serviceName: packageRow?.name ?? null,
      createdAt: row.created_at,
    };
  });
}

export type AdminOrderDetails = {
  id: string;
  orderNumber: string;
  status: string;
  vehicleType: string;
  packageType: string;
  vehicleSize: string;
  price: number;
  customerName: string | null;
  phone: string | null;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  workerName: string | null;
  distanceMeters: number | null;
};

function distanceMeters(firstLatitude: number, firstLongitude: number, secondLatitude: number, secondLongitude: number) {
  const earthRadius = 6371000;
  const latitudeDelta = ((secondLatitude - firstLatitude) * Math.PI) / 180;
  const longitudeDelta = ((secondLongitude - firstLongitude) * Math.PI) / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos((firstLatitude * Math.PI) / 180) * Math.cos((secondLatitude * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getOrderDetailsForAdmin(bookingId: string): Promise<AdminOrderDetails | null> {
  const supabase = await createClient();
  const { data: booking } = await supabase.from("bookings").select("id, booking_id, status, price_snapshot, address_text, city, latitude, longitude, customers(full_name, phone_number), customer_vehicles(vehicle_category, vehicle_size, brand, model), packages(name), booking_assignments(worker_id, status, workers(id, first_name, last_name))").eq("id", bookingId).single();
  if (!booking) return null;
  const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
  const vehicle = Array.isArray(booking.customer_vehicles) ? booking.customer_vehicles[0] : booking.customer_vehicles;
  const packageRow = Array.isArray(booking.packages) ? booking.packages[0] : booking.packages;
  const assignments = Array.isArray(booking.booking_assignments) ? booking.booking_assignments : [];
  const assignment = assignments.find((item) => item.status === "ACCEPTED") ?? assignments.find((item) => item.worker_id);
  const worker = assignment?.workers ? (Array.isArray(assignment.workers) ? assignment.workers[0] : assignment.workers) : null;
  let distance = null;
  if (worker) {
    const { data: location } = await supabase.from("worker_current_locations").select("latitude, longitude").eq("worker_id", worker.id).maybeSingle();
    if (location) distance = distanceMeters(booking.latitude, booking.longitude, location.latitude, location.longitude);
  }
  return {
    id: booking.id,
    orderNumber: booking.booking_id,
    status: booking.status,
    vehicleType: vehicle?.vehicle_category ?? "",
    packageType: packageRow?.name ?? "",
    vehicleSize: vehicle?.vehicle_size ?? "",
    price: Number(booking.price_snapshot),
    customerName: customer?.full_name ?? null,
    phone: customer?.phone_number ?? null,
    city: booking.city,
    address: booking.address_text,
    latitude: booking.latitude,
    longitude: booking.longitude,
    workerName: worker ? `${worker.first_name} ${worker.last_name}` : null,
    distanceMeters: distance,
  };
}

export type AdminOrderEventRow = { id: string; eventType: string; workerId: string | null; metadata: Record<string, unknown> | null; createdAt: string };

export async function listOrderEvents(bookingId: string): Promise<AdminOrderEventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("booking_assignments").select("id, worker_id, status, created_at, offer_expires_at").eq("booking_id", bookingId).order("created_at", { ascending: true });
  return (data ?? []).map((row) => ({ id: row.id, eventType: row.status, workerId: row.worker_id, metadata: row.offer_expires_at ? { expires_at: row.offer_expires_at } : null, createdAt: row.created_at }));
}

export async function listPackagesForAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.from("packages").select("id, name, base_price, vehicle_category, vehicle_size").eq("is_active", true).order("name");
  return data ?? [];
}
