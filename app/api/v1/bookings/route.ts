import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrder } from "@/lib/orders/create";
import { createOrderSchema } from "@/lib/validation/orders";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const providedKey = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!providedKey) return NextResponse.json({ error: { code: "INVALID_API_KEY", message: "مفتاح الوصول غير صالح" } }, { status: 401 });

  const supabase = createAdminClient();
  const keyHash = createHash("sha256").update(providedKey).digest("hex");
  const { data: apiKey } = await supabase.from("api_keys").select("source").eq("key_hash", keyHash).eq("is_active", true).is("revoked_at", null).maybeSingle();
  if (!apiKey) return NextResponse.json({ error: { code: "INVALID_API_KEY", message: "مفتاح الوصول غير صالح" } }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "صيغة JSON غير صالحة" } }, { status: 400 });
  }
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: { code: "MISSING_FIELD", message: issue?.message ?? "بيانات غير صالحة", field: issue?.path.join(".") } }, { status: 400 });
  }

  const result = await createOrder({ ...parsed.data, source: apiKey.source as typeof parsed.data.source });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.order }, { status: 201 });
}