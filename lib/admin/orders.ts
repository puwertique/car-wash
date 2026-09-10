import { createClient } from "@/lib/supabase/server";

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string | null;
  workerName: string | null;
  serviceName: string | null;
  createdAt: string;
};

export async function listOrdersForAdmin(): Promise<AdminOrderRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, created_at, customers(name), workers(first_name, last_name), services(name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const worker = Array.isArray(row.workers) ? row.workers[0] : row.workers;
    const service = Array.isArray(row.services) ? row.services[0] : row.services;

    return {
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      customerName: customer?.name ?? null,
      workerName: worker ? `${worker.first_name} ${worker.last_name}` : null,
      serviceName: service?.name ?? null,
      createdAt: row.created_at,
    };
  });
}

export type AdminOrderDetails = {
  id: string;
  orderNumber: string;
  status: string;
  vehicleType: string | null;
  packageType: string | null;
  vehicleSize: string | null;
  price: number;
  customerName: string | null;
  phone: string | null;
  city: string | null;
  address: string;
  latitude: number;
  longitude: number;
  workerName: string | null;
  distanceMeters: number | null;
};

function distanceMeters(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
) {
  const earthRadius = 6371000;
  const latitudeDelta = ((secondLatitude - firstLatitude) * Math.PI) / 180;
  const longitudeDelta = ((secondLongitude - firstLongitude) * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((firstLatitude * Math.PI) / 180) *
      Math.cos((secondLatitude * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getOrderDetailsForAdmin(
  orderId: string,
): Promise<AdminOrderDetails | null> {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, customer_vehicle_type, package_type, customer_vehicle_size, price, city, address, latitude, longitude, customers(name, phone), workers(id, first_name, last_name)",
    )
    .eq("id", orderId)
    .single();

  if (!order) return null;
  const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
  const worker = Array.isArray(order.workers) ? order.workers[0] : order.workers;
  const workerId = worker?.id;

  let distance = null;
  if (worker) {
    const { data: location } = await supabase
      .from("worker_current_locations")
      .select("latitude, longitude")
      .eq("worker_id", workerId ?? "")
      .maybeSingle();
    if (location) {
      distance = distanceMeters(order.latitude, order.longitude, location.latitude, location.longitude);
    }
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    vehicleType: order.customer_vehicle_type,
    packageType: order.package_type,
    vehicleSize: order.customer_vehicle_size,
    price: order.price,
    customerName: customer?.name ?? null,
    phone: customer?.phone ?? null,
    city: order.city,
    address: order.address,
    latitude: order.latitude,
    longitude: order.longitude,
    workerName: worker ? `${worker.first_name} ${worker.last_name}` : null,
    distanceMeters: distance,
  };
}

export type AdminOrderEventRow = {
  id: string;
  eventType: string;
  workerId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export async function listOrderEvents(orderId: string): Promise<AdminOrderEventRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("order_events")
    .select("id, event_type, worker_id, metadata, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    workerId: row.worker_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

export async function listServicesForAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("id, name, price")
    .eq("active", true)
    .order("name");
  return data ?? [];
}
