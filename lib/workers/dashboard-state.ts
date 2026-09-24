import { createClient } from "@/lib/supabase/server";

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  address: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  customer: { name: string; phone: string } | null;
  service: { name: string; price: number; vehicleCategory: string; vehicleSize: string } | null;
  price: number;
};

export type WorkerDashboardState = {
  workerId: string;
  status: "OFFLINE" | "AVAILABLE" | "BUSY";
  pendingAcceptance: OrderSummary | null;
  currentOrder: OrderSummary | null;
};

const ORDER_SELECT =
  "id, booking_id, status, address_text, latitude, longitude, notes, customers(full_name, phone_number), packages(name, base_price, vehicle_category, vehicle_size), price_snapshot";

function toSummary(row: Record<string, unknown>): OrderSummary {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const packageRow = Array.isArray(row.packages) ? row.packages[0] : row.packages;
  return {
    id: row.id as string,
    orderNumber: row.booking_id as string,
    status: row.status as string,
    address: row.address_text as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    notes: (row.notes as string | null) ?? null,
    customer: customer ? { name: customer.full_name, phone: customer.phone_number } : null,
    service: packageRow ? { name: packageRow.name, price: packageRow.base_price, vehicleCategory: packageRow.vehicle_category, vehicleSize: packageRow.vehicle_size } : null,
    price: row.price_snapshot as number,
  };
}

export async function getWorkerDashboardState(
  authUserId: string,
): Promise<WorkerDashboardState | null> {
  const supabase = await createClient();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, status")
    .eq("auth_user_id", authUserId)
    .single();

  if (!worker) return null;

  const [{ data: pendingAssignment }, { data: currentAssignment }] = await Promise.all([
    supabase.from("booking_assignments").select(`booking_id, bookings(${ORDER_SELECT})`).eq("worker_id", worker.id).eq("status", "ASSIGNED_PENDING_ACCEPTANCE").maybeSingle(),
    supabase.from("booking_assignments").select(`booking_id, bookings(${ORDER_SELECT})`).eq("worker_id", worker.id).in("status", ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "WASHING"]).maybeSingle(),
  ]);
  const pendingBookingRows = pendingAssignment?.bookings;
  const currentBookingRows = currentAssignment?.bookings;
  const pendingRow = (Array.isArray(pendingBookingRows) ? pendingBookingRows[0] : pendingBookingRows) as Record<string, unknown> | null | undefined;
  const currentOrderRow = (Array.isArray(currentBookingRows) ? currentBookingRows[0] : currentBookingRows) as Record<string, unknown> | null | undefined;

  return {
    workerId: worker.id,
    status: worker.status,
    pendingAcceptance: pendingRow ? toSummary(pendingRow) : null,
    currentOrder: currentOrderRow ? toSummary(currentOrderRow) : null,
  };
}
