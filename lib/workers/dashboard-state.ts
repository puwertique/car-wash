import { createClient } from "@/lib/supabase/server";

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  address: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  offerExpiresAt: string | null;
  customer: { name: string; phone: string } | null;
  service: { name: string; price: number } | null;
};

export type WorkerDashboardState = {
  workerId: string;
  status: "OFFLINE" | "AVAILABLE" | "BUSY";
  offer: OrderSummary | null;
  currentOrder: OrderSummary | null;
};

const ORDER_SELECT =
  "id, order_number, status, address, latitude, longitude, notes, offer_expires_at, customers(name, phone), services(name, price)";

function toSummary(row: Record<string, unknown>): OrderSummary {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const service = Array.isArray(row.services) ? row.services[0] : row.services;
  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    status: row.status as string,
    address: row.address as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    notes: (row.notes as string | null) ?? null,
    offerExpiresAt: (row.offer_expires_at as string | null) ?? null,
    customer: customer ? { name: customer.name, phone: customer.phone } : null,
    service: service ? { name: service.name, price: service.price } : null,
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

  const nowIso = new Date().toISOString();

  const [{ data: offerRow }, { data: currentOrderRow }] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("worker_id", worker.id)
      .eq("status", "OFFERED")
      .gt("offer_expires_at", nowIso)
      .maybeSingle(),
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("worker_id", worker.id)
      .in("status", ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "WASHING"])
      .maybeSingle(),
  ]);

  return {
    workerId: worker.id,
    status: worker.status,
    offer: offerRow ? toSummary(offerRow) : null,
    currentOrder: currentOrderRow ? toSummary(currentOrderRow) : null,
  };
}
