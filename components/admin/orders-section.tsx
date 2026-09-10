"use client";

import { useEffect, useState } from "react";
import type { AdminOrderDetails, AdminOrderEventRow, AdminOrderRow } from "@/lib/admin/orders";

type ListResponse = { data?: AdminOrderRow[]; error?: { message?: string } };
type DetailsResponse = { data?: { details: AdminOrderDetails; events: AdminOrderEventRow[] }; error?: { message?: string } };

export function OrdersSection() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/orders", { cache: "no-store" })
      .then(async (response) => ({ response, payload: (await response.json()) as ListResponse }))
      .then(({ response, payload }) => {
        if (cancelled) return;
        if (!response.ok) return setError(payload.error?.message ?? "Unable to load orders.");
        setOrders(payload.data ?? []);
      })
      .catch(() => { if (!cancelled) setError("Unable to load orders."); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <table className="w-full max-w-4xl text-left text-sm">
        <thead><tr className="border-b border-black/10"><th className="py-1 pr-4">Order #</th><th className="py-1 pr-4">Status</th><th className="py-1 pr-4">Customer</th><th className="py-1 pr-4">Worker</th><th className="py-1 pr-4">Service</th><th className="py-1 pr-4">Details</th></tr></thead>
        <tbody>
          {orders.map((order) => <tr key={order.id} className="border-b border-black/5"><td className="py-1 pr-4">{order.orderNumber}</td><td className="py-1 pr-4">{order.status}</td><td className="py-1 pr-4">{order.customerName ?? "-"}</td><td className="py-1 pr-4">{order.workerName ?? "-"}</td><td className="py-1 pr-4">{order.serviceName ?? "-"}</td><td className="py-1 pr-4"><button type="button" className="underline" onClick={() => setSelectedOrderId(order.id)}>View</button></td></tr>)}
          {orders.length === 0 && <tr><td colSpan={6} className="py-2 text-black/50">No orders yet.</td></tr>}
        </tbody>
      </table>
      {selectedOrderId && <OrderDetailsSection orderId={selectedOrderId} />}
    </div>
  );
}

function OrderDetailsSection({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<{ details: AdminOrderDetails; events: AdminOrderEventRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" })
      .then(async (response) => ({ response, payload: (await response.json()) as DetailsResponse }))
      .then(({ response, payload }) => {
        if (cancelled) return;
        if (!response.ok || !payload.data) return setError(payload.error?.message ?? "Unable to load order details.");
        setOrder(payload.data);
      })
      .catch(() => { if (!cancelled) setError("Unable to load order details."); });
    return () => { cancelled = true; };
  }, [orderId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!order) return <p className="text-sm text-black/50">Loading order details...</p>;

  return <OrderDetails details={order.details} events={order.events} />;
}

function OrderDetails({ details, events }: { details: AdminOrderDetails; events: AdminOrderEventRow[] }) {
  return <section className="max-w-3xl border border-black/10 p-4"><h2 className="mb-3 font-medium">Order details: {details.orderNumber}</h2><dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-3"><dt className="text-black/60">Status</dt><dd>{details.status}</dd><dt className="text-black/60">Vehicle type</dt><dd>{details.vehicleType ?? "-"}</dd><dt className="text-black/60">Package</dt><dd>{details.packageType ?? "-"}</dd><dt className="text-black/60">Vehicle size</dt><dd>{details.vehicleSize ?? "-"}</dd><dt className="text-black/60">Price</dt><dd>{details.price}</dd><dt className="text-black/60">Customer</dt><dd>{details.customerName ?? "-"}</dd><dt className="text-black/60">Phone</dt><dd>{details.phone ?? "-"}</dd><dt className="text-black/60">City</dt><dd>{details.city ?? "-"}</dd><dt className="text-black/60">Address</dt><dd>{details.address}</dd><dt className="text-black/60">Assigned worker</dt><dd>{details.workerName ?? "-"}</dd><dt className="text-black/60">Latitude</dt><dd>{details.latitude}</dd><dt className="text-black/60">Longitude</dt><dd>{details.longitude}</dd><dt className="text-black/60">Distance</dt><dd>{details.distanceMeters == null ? "-" : `${(details.distanceMeters / 1000).toFixed(2)} km`}</dd></dl><iframe title="Customer location" className="mt-4 h-64 w-full border-0" loading="lazy" src={`https://www.google.com/maps?q=${details.latitude},${details.longitude}&output=embed`} /><h3 className="mb-2 mt-6 font-medium">Events</h3><ul className="space-y-1 text-sm">{events.map((event) => <li key={event.id} className="border-b border-black/5 py-1"><span className="font-mono text-xs text-black/50">{new Date(event.createdAt).toLocaleTimeString()}</span>{" "}{event.eventType}{event.metadata && <span className="text-black/50"> - {JSON.stringify(event.metadata)}</span>}</li>)}{events.length === 0 && <li className="text-black/50">No events recorded.</li>}</ul></section>;
}