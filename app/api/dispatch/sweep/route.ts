import { NextResponse } from "next/server";
import { runDispatchSweep } from "@/lib/dispatch/sweep";

/**
 * Progresses dispatch (expired offer timeouts + retry of undispatched
 * orders). Called by client-side polling in the worker dashboard and
 * admin console — see docs/ARCHITECTURE.md for why there's no separate
 * background job runner in the MVP.
 */
export async function POST() {
  await runDispatchSweep();
  return NextResponse.json({ data: { ok: true } });
}
