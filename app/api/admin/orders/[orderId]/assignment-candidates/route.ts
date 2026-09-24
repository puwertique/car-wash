import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/session";
import { listAssignmentCandidates } from "@/lib/admin/assignment";

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  const { orderId } = await context.params;
  const result = await listAssignmentCandidates(orderId);
  if (!result) return NextResponse.json({ error: { message: "Booking not found." } }, { status: 404 });
  return NextResponse.json({ data: result });
}
