"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { LogoutButton } from "@/components/worker/logout-button";
import { setEmploymentStatus, updateWorker, type WorkerActionState } from "./actions";
import type { getWorkerDetailsForAdmin } from "@/lib/admin/worker-details";

type Worker = NonNullable<Awaited<ReturnType<typeof getWorkerDetailsForAdmin>>>;
const initial: WorkerActionState = { error: null, success: null };

export function WorkerDetailsForm({ worker }: { worker: Worker }) {
  const [editing, setEditing] = useState(false);
  const [saveState, saveAction, saving] = useActionState(updateWorker, initial);
  const [statusState, statusAction, statusPending] = useActionState(setEmploymentStatus, initial);

  return (
    <main className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><Link href="/admin/workers" className="text-sm underline">Back to workers</Link><h1 className="mt-2 text-xl font-semibold">{worker.first_name} {worker.last_name}</h1></div>
        <div className="flex gap-2"><button type="button" onClick={() => setEditing(!editing)} className="rounded border border-black/20 px-3 py-1.5 text-sm">{editing ? "Cancel" : "Edit"}</button><LogoutButton /></div>
      </div>
      <form action={saveAction} className="space-y-5">
        <input type="hidden" name="worker_id" value={worker.id} />
        {editing ? <EditableFields worker={worker} /> : <ReadOnlyFields worker={worker} />}
        {editing && <button disabled={saving} className="rounded bg-black px-4 py-2 text-sm text-white">{saving ? "Saving..." : "Save changes"}</button>}
        {saveState.error && <p className="text-sm text-red-600">{saveState.error}</p>}
        {saveState.success && <p className="text-sm text-green-700">{saveState.success}</p>}
      </form>
      <div className="flex items-center gap-3">
        <form action={statusAction}><input type="hidden" name="worker_id" value={worker.id} /><input type="hidden" name="employment_status" value={worker.employment_status === "active" ? "suspended" : "active"} /><button disabled={statusPending} className="rounded border border-black/20 px-3 py-1.5 text-sm">{worker.employment_status === "active" ? "Suspend" : "Activate"}</button></form>
        {worker.employment_status !== "archived" && <form action={statusAction}><input type="hidden" name="worker_id" value={worker.id} /><input type="hidden" name="employment_status" value="archived" /><button disabled={statusPending} className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700">Archive</button></form>}
        {statusState.error && <span className="text-sm text-red-600">{statusState.error}</span>}{statusState.success && <span className="text-sm text-green-700">{statusState.success}</span>}
      </div>
    </main>
  );
}

function EditableFields({ worker }: { worker: Worker }) {
  const fieldClass = "rounded border px-2 py-1.5 text-sm";
  const field = (name: string, label: string, value: string, type = "text") => <label className="space-y-1 text-sm"><span className="block font-medium">{label}</span><input name={name} defaultValue={value} type={type} className={fieldClass} /></label>;
  const file = (name: string, accept: string, label: string) => <label className="text-sm"><span className="block font-medium">{label}</span><input name={name} type="file" accept={accept} className="mt-1 block w-full text-xs" /></label>;
  return <div className="grid max-w-2xl grid-cols-2 gap-3">
    {field("first_name", "First name", worker.first_name)}{field("last_name", "Last name", worker.last_name)}
    {field("phone", "Phone", worker.phone)}{field("email", "Email", worker.email ?? "", "email")}
    {field("city", "City", worker.city)}
    <label className="space-y-1 text-sm"><span className="block font-medium">Compensation model</span><select name="compensation_model" defaultValue={worker.compensation_model} className={fieldClass}><option value="percentage">Percentage</option><option value="fixed_per_booking">Fixed per booking</option><option value="salary">Salary</option></select></label>
    {field("compensation_value", "Compensation value", String(worker.compensation_value), "number")}
    <label className="space-y-1 text-sm"><span className="block font-medium">Vehicle type</span><select name="work_vehicle_type" defaultValue={worker.work_vehicle_type} className={fieldClass}><option value="tricycle_motorcycle">Tricycle motorcycle</option><option value="van">Van</option></select></label>
    {field("vehicle_plate_number", "Vehicle plate number", worker.vehicle_plate_number)}{field("cin_number", "CIN number", worker.cin_number ?? "")}
    {field("birth_date", "Birth date", worker.birth_date ?? "", "date")}
    <label className="col-span-2 space-y-1 text-sm"><span className="block font-medium">Full address</span><input name="full_address" defaultValue={worker.full_address ?? ""} className={fieldClass + " w-full"} /></label>
    <label className="col-span-2 space-y-1 text-sm"><span className="block font-medium">Eligible package UUIDs</span><input name="eligible_package_ids" defaultValue={(worker.eligible_package_ids ?? []).join(",")} className={fieldClass + " w-full"} /></label>
    {file("vehicle_photo", "image/jpeg,image/png,image/webp", "Vehicle photo")}{file("carte_grise_photo", "image/jpeg,image/png,image/webp", "Carte grise")}{file("cin_photo", "image/jpeg,image/png,image/webp", "CIN photo")}{file("portrait", "image/jpeg,image/png,image/webp", "Portrait")}{file("employment_contract", "application/pdf", "Employment contract")}{file("insurance_photo", "image/jpeg,image/png,image/webp", "Insurance photo")}
  </div>;
}

function ReadOnlyFields({ worker }: { worker: Worker }) {
  const fields = [["Phone", worker.phone], ["Email", worker.email ?? "-"], ["City", worker.city], ["Operational status", worker.status], ["Employment status", worker.employment_status], ["Vehicle type", worker.work_vehicle_type], ["Vehicle plate", worker.vehicle_plate_number], ["Compensation", `${worker.compensation_value}${worker.compensation_model === "percentage" ? "%" : " MAD"} (${worker.compensation_model})`], ["Full address", worker.full_address ?? "-"], ["Birth date", worker.birth_date ?? "-"], ["CIN", worker.cin_number ?? "-"], ["Eligible packages", (worker.eligible_package_ids ?? []).join(", ") || "-"], ["Joined", new Date(worker.created_at).toLocaleDateString()]];
  return <div className="grid max-w-2xl grid-cols-2 gap-x-6 gap-y-3 text-sm">{fields.map(([label, value]) => <div key={label}><p className="text-black/60">{label}</p><p>{value}</p></div>)}<ImageLightbox label="Worker portrait" url={worker.files.portrait} /><ImageLightbox label="Vehicle photo" url={worker.files.vehicle_photo_path} /><ImageLightbox label="Carte grise" url={worker.files.carte_grise_photo_path} /><ImageLightbox label="CIN photo" url={worker.files.cin_photo_path} /><FilePreview label="Employment contract" url={worker.files.employment_contract_path} /><ImageLightbox label="Insurance photo" url={worker.files.insurance_photo_path} /></div>;
}

function FilePreview({ label, url }: { label: string; url: string | null }) { return <div className="col-span-2"><p className="text-sm text-black/60">{label}</p>{url ? <a href={url} target="_blank" rel="noreferrer" className="text-sm underline">View file</a> : <span className="text-sm">-</span>}</div>; }

function ImageLightbox({ label, url }: { label: string; url: string | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function downloadImage() {
    if (!url) return;
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = label.toLowerCase().replaceAll(" ", "-") + ".jpg";
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  return <div className="col-span-2"><p className="text-sm text-black/60">{label}</p>{url ? <><button type="button" onClick={() => setOpen(true)} className="text-sm underline">View image</button>{open && <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div className="relative max-h-[90vh] max-w-[90vw] rounded bg-white p-3"><img src={url} alt={label} className="max-h-[75vh] max-w-[85vw] object-contain" /><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => void downloadImage()} className="rounded bg-black px-3 py-1.5 text-sm text-white">Download</button><button type="button" onClick={() => setOpen(false)} className="rounded border border-black/20 px-3 py-1.5 text-sm">Close</button></div></div></div>}</> : <span className="text-sm">-</span>}</div>;
}
