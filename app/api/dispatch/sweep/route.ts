import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: { message: "Automatic dispatch is disabled. Use manual assignment instead." } },
    { status: 410 },
  );
}
