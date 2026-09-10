"use client";

import { useEffect, useState } from "react";
import type { AdminWorkerRow } from "@/lib/admin/workers";

type ApiResponse = { data?: AdminWorkerRow[]; error?: { message?: string } };

export function WorkersSection() {
  const [workers, setWorkers] = useState<AdminWorkerRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkers() {
      const response = await fetch("/api/admin/workers", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse;
      if (cancelled) return;
      if (!response.ok) {
        setError(payload.error?.message ?? "Unable to load workers.");
        return;
      }
      setWorkers(payload.data ?? []);
    }

    void loadWorkers().catch(() => {
      if (!cancelled) setError("Unable to load workers.");
    });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <table className="w-full max-w-3xl text-left text-sm">
      <thead><tr className="border-b border-black/10"><th className="py-1 pr-4">Name</th><th className="py-1 pr-4">Status</th><th className="py-1 pr-4">City</th><th className="py-1 pr-4">Vehicle</th><th className="py-1 pr-4">Last location</th></tr></thead>
      <tbody>
        {workers.map((worker) => <tr key={worker.id} className="border-b border-black/5"><td className="py-1 pr-4">{worker.name}</td><td className="py-1 pr-4">{worker.status}</td><td className="py-1 pr-4">{worker.city ?? "-"}</td><td className="py-1 pr-4">{worker.vehicle ?? "Not assigned"}</td><td className="py-1 pr-4">{worker.lastLocationAt ? new Date(worker.lastLocationAt).toLocaleTimeString() : "-"}</td></tr>)}
        {workers.length === 0 && <tr><td colSpan={5} className="py-2 text-black/50">No workers yet.</td></tr>}
      </tbody>
    </table>
  );
}