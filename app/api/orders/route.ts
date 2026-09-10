import { NextResponse, type NextRequest } from "next/server";
import { createOrderSchema } from "@/lib/validation/orders";
import { createOrder } from "@/lib/orders/create";

/**
 * External order intake. Protected by a shared API key (trusted
 * booking systems only in MVP) rather than end-user authentication.
 */
export async function POST(request: NextRequest) {
  const expectedKey = process.env.ORDERS_API_KEY;
  if (expectedKey) {
    const providedKey = request.headers.get("x-api-key");
    if (providedKey !== expectedKey) {
      return NextResponse.json(
        { error: { message: "Unauthorized" } },
        { status: 401 },
      );
    }
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

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Invalid input.", issues: parsed.error.issues } },
      { status: 400 },
    );
  }

  const result = await createOrder(parsed.data);
  if (result.error) {
    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
  }

  return NextResponse.json({ data: result.order }, { status: 201 });
}
