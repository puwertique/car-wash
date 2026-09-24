"use client";

import { useCallback, useEffect, useState } from "react";
import { GpsTracker } from "@/components/worker/gps-tracker";
import {
  acceptAssignment,
  advanceOrder,
  uploadOrderPhotoAction,
} from "./actions";
import type { TransitionableStatus } from "@/lib/orders/transitions";
import type { WorkerDashboardState } from "@/lib/workers/dashboard-state";

const POLL_INTERVAL_MS = 5_000;

const NEXT_STEP: Partial<Record<string, { label: string; next: TransitionableStatus }>> = {
  ACCEPTED: { label: "On the way", next: "ON_THE_WAY" },
  ON_THE_WAY: { label: "Arrived", next: "ARRIVED" },
  ARRIVED: { label: "Start wash", next: "WASHING" },
  WASHING: { label: "Complete job", next: "COMPLETED" },
};

export function OrderPanel() {
  const [state, setState] = useState<WorkerDashboardState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/worker/state", { cache: "no-store" });
      if (!res.ok) return;
      const { data } = await res.json();
      setState(data);
    } catch {
      // ignore transient network errors, will retry on next poll
    }
  }, []);

  useEffect(() => {
    const initialTimeoutId = setTimeout(() => refresh(), 0);
    const interval = setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialTimeoutId);
      clearInterval(interval);
    };
  }, [refresh]);

  if (!state) {
    return <p className="text-sm text-black/50">Loading…</p>;
  }

  const { pendingAcceptance, currentOrder, status } = state;

  async function handle(action: () => Promise<{ error: string | null }>) {
    setPending(true);
    setError(null);
    const result = await action();
    setError(result.error);
    setPending(false);
    refresh();
  }

  return (
    <div className="space-y-4">
      <GpsTracker active={status !== "OFFLINE"} />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {pendingAcceptance && (
        <div className="rounded border border-amber-400 bg-amber-50 p-4 space-y-2">
          <p className="font-medium">New assignment — {pendingAcceptance.orderNumber}</p>
          <p className="text-sm">{pendingAcceptance.service?.name ?? "Service"} · {pendingAcceptance.address}</p>
          <p className="text-xs text-black/60">Assigned by admin — confirm to start</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => handle(() => acceptAssignment(pendingAcceptance.id))}
              className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {currentOrder && (
        <div className="rounded border border-black/10 p-4 space-y-3">
          <p className="font-medium">
            {currentOrder.orderNumber} · {currentOrder.status}
          </p>
          <p className="text-sm font-medium">{currentOrder.customer?.name}</p>
          <a
            href={`tel:${currentOrder.customer?.phone}`}
            className="inline-block text-sm underline"
          >
            {currentOrder.customer?.phone}
          </a>
          <p className="text-sm">{currentOrder.service?.name} · {currentOrder.service?.vehicleCategory} · {currentOrder.service?.vehicleSize}</p>
          <p className="text-sm font-medium">{currentOrder.price} MAD</p>
          <p className="text-sm">{currentOrder.address}</p>
          {currentOrder.notes && (
            <p className="text-xs text-black/60">Notes: {currentOrder.notes}</p>
          )}

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${currentOrder.latitude},${currentOrder.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm underline"
          >
            Open navigation
          </a>

          <div className="flex flex-wrap gap-2">
            <OrderPhotoUpload orderId={currentOrder.id} kind="before" label="Before photo" />
            <OrderPhotoUpload orderId={currentOrder.id} kind="after" label="After photo" />
          </div>

          {NEXT_STEP[currentOrder.status] && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                handle(() => advanceOrder(currentOrder.id, NEXT_STEP[currentOrder.status]!.next))
              }
              className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {NEXT_STEP[currentOrder.status]!.label}
            </button>
          )}
        </div>
      )}

      {!pendingAcceptance && !currentOrder && (
        <p className="text-sm text-black/50">No active job right now.</p>
      )}
    </div>
  );
}

function OrderPhotoUpload({
  orderId,
  kind,
  label,
}: {
  orderId: string;
  kind: "before" | "after";
  label: string;
}) {
  return (
    <form
      action={async (formData) => {
        await uploadOrderPhotoAction(orderId, kind, formData);
      }}
      className="flex items-center gap-2"
    >
      <span className="text-xs text-black/60">{label}</span>
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="text-xs" />
      <button type="submit" className="rounded border border-black/20 px-2 py-1 text-xs">
        Upload
      </button>
    </form>
  );
}
