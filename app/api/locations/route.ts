import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateLocationSchema } from "@/lib/validation/location";
import { updateWorkerLocation } from "@/lib/workers/location";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Invalid input.", issues: parsed.error.issues } },
      { status: 400 },
    );
  }

  const result = await updateWorkerLocation(user.id, parsed.data);
  if (result.error) {
    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
  }

  return NextResponse.json({ data: { ok: true } });
}
