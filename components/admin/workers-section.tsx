"use client";

import { useEffect, useState } from "react";
import type { AdminWorkerRow } from "@/lib/admin/workers";

type ApiResponse = { data?: AdminWorkerRow[]; error?: { message?: string } };

export function WorkersSection() {
  const [workers, setWorkers] = useState<AdminWorkerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [contactWorkerId, setContactWorkerId] = useState<string | null>(null);
  const [locationWorkerId, setLocationWorkerId] = useState<string | null>(null);

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
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border border-black/10">
        <table className="w-full min-w-[620px] text-left text-sm">
      <thead><tr className="border-b border-black/10"><th className="py-2 pl-3 pr-4">Worker</th><th className="py-2 pr-4">City</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-3 text-right">Actions</th></tr></thead>
      <tbody>
        {workers.map((worker) => <WorkerRow key={worker.id} worker={worker} contactOpen={contactWorkerId === worker.id} onContact={() => setContactWorkerId(contactWorkerId === worker.id ? null : worker.id)} onLocation={() => setLocationWorkerId(worker.id)} />)}
        {workers.length === 0 && <tr><td colSpan={4} className="py-3 pl-3 text-black/50">No workers yet.</td></tr>}
      </tbody>
    </table>
      </div>
      {locationWorkerId && <LocationPanel worker={workers.find((worker) => worker.id === locationWorkerId)!} onClose={() => setLocationWorkerId(null)} />}
    </div>
  );
}

function WorkerRow({ worker, contactOpen, onContact, onLocation }: { worker: AdminWorkerRow; contactOpen: boolean; onContact: () => void; onLocation: () => void }) {
  const status = worker.operationalStatus;
  const statusClass = status === "AVAILABLE" ? "bg-green-100 text-green-800" : status === "BUSY" ? "bg-amber-100 text-amber-800" : "bg-black/10 text-black/60";
  const whatsappNumber = worker.phone.replace(/\D/g, "").replace(/^0/, "212");
  return <tr className="border-b border-black/5 last:border-0">
    <td className="py-2 pl-3 pr-4"><div className="flex items-center gap-2"><div className="h-9 w-9 overflow-hidden rounded-full bg-black/10">{worker.profilePhotoUrl && <img src={worker.profilePhotoUrl} alt="" className="h-full w-full object-cover" />}</div><span className="font-medium">{worker.name}</span></div></td>
    <td className="py-2 pr-4">{worker.city}</td>
    <td className="py-2 pr-4"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}>{status === "AVAILABLE" ? "Available" : status === "BUSY" ? "Busy" : "Offline"}</span></td>
    <td className="relative py-2 pr-3 text-right"><div className="flex justify-end gap-2"><button type="button" title="Contact worker" onClick={onContact} className="rounded border border-black/10 px-2 py-1">☎</button><button type="button" title="View current location" onClick={onLocation} className="rounded border border-black/10 px-2 py-1">⌖</button><a href={`/admin/workers/${worker.id}`} title="View worker details" className="rounded border border-black/10 px-2 py-1">ⓘ</a></div>{contactOpen && <div className="absolute right-3 z-10 mt-2 w-32 rounded border border-black/10 bg-white p-2 text-left shadow"><a className="block px-2 py-1 text-sm hover:bg-black/5" href={`tel:${worker.phone}`}>Call</a><a className="block px-2 py-1 text-sm hover:bg-black/5" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp</a></div>}</td>
  </tr>;
}

function LocationPanel({ worker, onClose }: { worker: AdminWorkerRow; onClose: () => void }) {
  return <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true"><div className="relative w-full max-w-2xl rounded bg-white p-4 shadow-lg"><button type="button" onClick={onClose} className="absolute right-4 top-3 text-sm underline">Close</button><h2 className="mb-3 font-medium">{worker.name} location</h2>{worker.latitude == null || worker.longitude == null ? <p className="text-sm text-black/60">No location available.</p> : <LocationContent worker={worker} />}</div></div>;
}

function LocationContent({ worker }: { worker: AdminWorkerRow }) {
  const coordinates = `${worker.latitude}, ${worker.longitude}`;
  return <><iframe title={`${worker.name} location map`} className="h-64 w-full border-0" loading="lazy" src={`https://www.google.com/maps?q=${worker.latitude},${worker.longitude}&output=embed`} /><div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="font-mono">{coordinates}</span><button type="button" onClick={() => navigator.clipboard.writeText(coordinates)} className="rounded border border-black/15 px-3 py-1.5">Copy coordinates</button></div><p className="mt-2 text-xs text-black/60">Last updated: {worker.locationUpdatedAt ? new Date(worker.locationUpdatedAt).toLocaleString() : "-"}</p></>;
}