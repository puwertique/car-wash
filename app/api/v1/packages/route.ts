import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const vehicleCategories = new Set(["car", "moto"]);
const vehicleSizes = new Set(["citadine", "berline", "suv_medium", "suv_large", "moto_small", "moto_large"]);

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const providedKey = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!providedKey) return NextResponse.json({ error: { code: "INVALID_API_KEY", message: "Invalid API key." } }, { status: 401 });

  const admin = createAdminClient();
  const keyHash = createHash("sha256").update(providedKey).digest("hex");
  const { data: apiKey } = await admin.from("api_keys").select("source").eq("key_hash", keyHash).eq("is_active", true).is("revoked_at", null).maybeSingle();
  if (!apiKey) return NextResponse.json({ error: { code: "INVALID_API_KEY", message: "Invalid API key." } }, { status: 401 });

  const category = request.nextUrl.searchParams.get("vehicle_category");
  const size = request.nextUrl.searchParams.get("vehicle_size");
  if (category && !vehicleCategories.has(category)) return NextResponse.json({ error: { code: "INVALID_FILTER", message: "Invalid vehicle_category filter." } }, { status: 400 });
  if (size && !vehicleSizes.has(size)) return NextResponse.json({ error: { code: "INVALID_FILTER", message: "Invalid vehicle_size filter." } }, { status: 400 });

  let query = admin.from("packages").select("id, name, description, vehicle_category, vehicle_size, base_price, estimated_duration_minutes").eq("is_active", true).order("vehicle_category").order("vehicle_size").order("base_price");
  if (category) query = query.eq("vehicle_category", category);
  if (size) query = query.eq("vehicle_size", size);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: { code: "PACKAGE_LIST_FAILED", message: "Unable to load packages." } }, { status: 500 });

  return NextResponse.json({ data: data ?? [], source: apiKey.source });
}
