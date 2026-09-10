import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/session";
import { listOrdersForAdmin } from "@/lib/admin/orders";

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  return NextResponse.json({ data: await listOrdersForAdmin() });
}