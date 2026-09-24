import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("covered_cities").select("id").eq("is_active", true).order("id");
  if (error) return NextResponse.json({ error: { code: "COVERED_CITIES_UNAVAILABLE", message: "Unable to load covered cities." } }, { status: 500 });
  return NextResponse.json({ cities: (data ?? []).map((city) => city.id) });
}
