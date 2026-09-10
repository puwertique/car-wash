import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/session";
import { getOrderDetailsForAdmin, listOrderEvents } from "@/lib/admin/orders";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/admin/orders/[orderId]">,
) {
  const profile = await getSessionProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { orderId } = await context.params;
  const details = await getOrderDetailsForAdmin(orderId);
  if (!details) {
    return NextResponse.json({ error: { message: "Order not found." } }, { status: 404 });
  }

  return NextResponse.json({ data: { details, events: await listOrderEvents(orderId) } });
}