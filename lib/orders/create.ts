import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateOrderInput } from "@/lib/validation/orders";

export type CreateOrderError = { code: string; message: string; field?: string };
export type CreateOrderResult =
  | { error: CreateOrderError; order?: undefined; status: number }
  | { error: null; order: { id: string; booking_id: string; status: string; price: number }; status: 201 };

function isFutureDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return date >= today;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!isFutureDate(input.requested_date)) return { status: 422, error: { code: "INVALID_SCHEDULE", message: "لا يمكن الحجز في تاريخ سابق", field: "requested_date" } };
  const admin = createAdminClient();
  const { data: coveredCity } = await admin.from("covered_cities").select("id").eq("id", input.city.toLowerCase()).eq("is_active", true).maybeSingle();
  if (!coveredCity) return { status: 422, error: { code: "CITY_NOT_COVERED", message: "الخدمة غير متوفرة حاليا فهاد المدينة", field: "city" } };
  const { data: packageRow } = await admin.from("packages").select("id, base_price, is_active, vehicle_category, vehicle_size").eq("id", input.package_id).maybeSingle();
  const packageFitsMoto = input.package_id === "wash_premium_moto" && input.vehicle_category === "moto";
  if (!packageRow || !packageRow.is_active || packageRow.vehicle_category !== input.vehicle_category || (packageRow.vehicle_size !== input.vehicle_size && !packageFitsMoto)) return { status: 422, error: { code: "PACKAGE_NOT_FOUND", message: "الباقة المطلوبة غير موجودة أو لا تناسب السيارة", field: "package_id" } };

  const { data: addOnRows } = input.add_ons.length ? await admin.from("add_ons").select("id, price, is_active").in("id", input.add_ons) : { data: [] };
  if ((addOnRows ?? []).length !== new Set(input.add_ons).size || (addOnRows ?? []).some((addOn) => !addOn.is_active)) return { status: 422, error: { code: "ADDON_NOT_FOUND", message: "إضافة غير معروفة أو غير متاحة", field: "add_ons" } };
  if (input.promo_code) return { status: 422, error: { code: "PROMO_CODE_NOT_FOUND", message: "رمز الخصم غير صالح حاليا", field: "promo_code" } };

  const { data: rows, error } = await admin.rpc("create_booking_atomic", {
    p_customer: { full_name: input.full_name, phone_number: input.phone_number, email: input.email ?? null, preferred_language: input.preferred_language, source: input.source, utm_campaign: input.utm_campaign ?? null },
    p_vehicle: { vehicle_category: input.vehicle_category, vehicle_size: input.vehicle_size, brand: input.brand ?? null, model: input.model ?? null, plate_number: input.plate_number ?? null, color: input.color ?? null, condition: input.condition ?? null },
    p_booking: { package_id: input.package_id, latitude: input.latitude, longitude: input.longitude, address_text: input.address_text, city: input.city, location_type: input.location_type ?? null, access_notes: input.access_notes ?? null, requested_date: input.requested_date, requested_time_slot: input.requested_time_slot, is_asap: input.is_asap, recurrence: input.recurrence, payment_method: input.payment_method, source: input.source, marketing_consent: input.marketing_consent, notes: input.notes ?? null },
    p_add_on_ids: input.add_ons,
  });
  const booking = rows?.[0];
  if (error || !booking) return { status: 500, error: { code: "BOOKING_CREATE_FAILED", message: "تعذر إنشاء الحجز" } };

  return { status: 201, error: null, order: { id: booking.id, booking_id: booking.booking_id, status: booking.status, price: Number(booking.price_snapshot) } };
}
