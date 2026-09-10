import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkerDashboardState } from "@/lib/workers/dashboard-state";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const state = await getWorkerDashboardState(user.id);
  if (!state) {
    return NextResponse.json({ error: { message: "Worker profile not found." } }, { status: 404 });
  }

  return NextResponse.json({ data: state });
}
