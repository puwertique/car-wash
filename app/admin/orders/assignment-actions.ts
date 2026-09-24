"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";

export type AssignmentActionState = { error: string | null; success: string | null };

export async function removeAssignment(_previous: AssignmentActionState, formData: FormData): Promise<AssignmentActionState> {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) return { error: "Unauthorized.", success: null };
  const bookingId = String(formData.get("booking_id"));
  const admin = createAdminClient();
  const { data: assignment } = await admin.from("booking_assignments").select("id, worker_id").eq("booking_id", bookingId).in("status", ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "WASHING"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!assignment) return { error: "No active assignment found for this booking.", success: null };
  const { error: deleteError } = await admin.from("booking_assignments").update({ status: "proposed", worker_id: null }).eq("id", assignment.id);
  if (deleteError) return { error: "Unable to remove assignment.", success: null };
  const { error: bookingError } = await admin.from("bookings").update({ status: "pending" }).eq("id", bookingId);
  if (bookingError) return { error: "Assignment removed, but booking status could not be updated.", success: null };
  const { data: activeAssignments } = await admin.from("booking_assignments").select("id").eq("worker_id", assignment.worker_id).in("status", ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "WASHING"]);
  if ((activeAssignments ?? []).length === 0) {
    await admin.from("workers").update({ status: "AVAILABLE" }).eq("id", assignment.worker_id);
  }
  await admin.from("status_history").insert({ booking_id: bookingId, old_status: "assigned", new_status: "pending" });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${bookingId}`);
  return { error: null, success: "Assignment removed." };
}

export async function assignWorker(_previous: AssignmentActionState, formData: FormData): Promise<AssignmentActionState> {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) return { error: "Unauthorized.", success: null };
  const bookingId = String(formData.get("booking_id"));
  const workerId = String(formData.get("worker_id"));
  const admin = createAdminClient();
  const { data: booking } = await admin.from("bookings").select("id").eq("id", bookingId).maybeSingle();
  const { data: worker } = await admin.from("workers").select("id").eq("id", workerId).eq("employment_status", "active").in("status", ["AVAILABLE", "BUSY"]).maybeSingle();
  if (!booking || !worker) return { error: "The booking or worker is no longer available.", success: null };

  const { data: existing } = await admin.from("booking_assignments").select("id").eq("booking_id", bookingId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const assignmentData = { worker_id: workerId, status: "ASSIGNED_PENDING_ACCEPTANCE", assigned_at: new Date().toISOString(), sent_at: new Date().toISOString(), offer_expires_at: null };
  const assignmentResult = existing
    ? await admin.from("booking_assignments").update(assignmentData).eq("id", existing.id)
    : await admin.from("booking_assignments").insert({ booking_id: bookingId, ...assignmentData });
  if (assignmentResult.error) return { error: "Unable to assign worker.", success: null };
  const { error: bookingError } = await admin.from("bookings").update({ status: "assigned" }).eq("id", bookingId);
  if (bookingError) return { error: "Worker assigned, but booking status could not be updated.", success: null };
  await admin.from("status_history").insert({ booking_id: bookingId, old_status: null, new_status: "assigned" });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${bookingId}`);
  return { error: null, success: "Worker assigned." };
}
