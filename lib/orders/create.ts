import { createAdminClient } from "@/lib/supabase/admin";
import { recordSystemOrderEvent } from "@/lib/orders/events";
import { dispatchOrder } from "@/lib/dispatch/offer";
import { geocodeAddress } from "@/lib/geo/google-geocoding";
import type { CreateOrderInput } from "@/lib/validation/orders";

export type CreateOrderResult =
  | { error: string; order?: undefined }
  | { error: null; order: { id: string; order_number: string; status: string } };

/**
 * Finds or creates the customer (matched by phone), creates the order,
 * logs ORDER_CREATED, and kicks off dispatch. Uses the service-role
 * client — this is the trusted server-side entry point for order
 * intake (called from the API route, never directly from the browser).
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const admin = createAdminClient();

  const geocoded =
    input.latitude === undefined || input.longitude === undefined
      ? await geocodeAddress(input.city, input.address)
      : null;
  const latitude = input.latitude ?? geocoded?.latitude;
  const longitude = input.longitude ?? geocoded?.longitude;

  if (latitude === undefined || longitude === undefined) {
    return {
      error:
        "Could not locate this address. Provide latitude/longitude or configure GOOGLE_MAPS_API_KEY.",
    };
  }

  const { data: service, error: serviceError } = await admin
    .from("services")
    .select("id, price, active")
    .eq("id", input.service_id)
    .single();

  if (serviceError || !service || !service.active) {
    return { error: "Unknown or inactive service_id." };
  }

  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("phone", input.phone)
    .maybeSingle();

  let customerId = existingCustomer?.id as string | undefined;

  if (!customerId) {
    const { data: newCustomer, error: customerError } = await admin
      .from("customers")
      .insert({
        name: input.customer_name,
        phone: input.phone,
        address: input.address,
        latitude,
        longitude,
      })
      .select("id")
      .single();

    if (customerError || !newCustomer) {
      return { error: "Failed to create customer." };
    }
    customerId = newCustomer.id;
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      customer_id: customerId,
      service_id: input.service_id,
      customer_vehicle_type: input.vehicle_type ?? null,
      customer_vehicle_size: input.vehicle_size ?? null,
      package_type: input.package_type ?? null,
      city: input.city,
      price: service.price,
      address: input.address,
      latitude,
      longitude,
      location: `SRID=4326;POINT(${longitude} ${latitude})`,
      notes: input.notes ?? null,
      scheduled_at: input.scheduled_at ?? null,
      status: "NEW",
    })
    .select("id, order_number, status")
    .single();

  if (orderError || !order) {
    return { error: "Failed to create order." };
  }

  await recordSystemOrderEvent(order.id, "ORDER_CREATED", {
    customer_id: customerId,
    service_id: input.service_id,
  });

  await dispatchOrder(order.id);

  return { error: null, order };
}
