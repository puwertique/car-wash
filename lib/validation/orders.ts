import { z } from "zod";

const phoneNumber = /^\+212[5-7]\d{8}$/;
const slot = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

export const createOrderSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone_number: z.string().trim().regex(phoneNumber),
  email: z.string().email().optional(),
  preferred_language: z.enum(["ar", "fr", "darija"]).default("ar"),
  source: z.enum(["wordpress", "whatsapp_bot", "facebook", "instagram", "referral"]),
  utm_campaign: z.string().trim().max(50).optional(),
  vehicle_category: z.enum(["car", "moto"]),
  vehicle_size: z.enum(["citadine", "berline", "suv_medium", "suv_large", "moto_small", "moto_large"]),
  brand: z.string().trim().max(30).optional(),
  model: z.string().trim().max(30).optional(),
  plate_number: z.string().trim().max(20).optional(),
  color: z.string().trim().max(30).optional(),
  condition: z.string().trim().max(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address_text: z.string().trim().min(5),
  city: z.string().trim().min(1),
  location_type: z.enum(["home", "office", "parking", "hotel", "other"]).optional(),
  access_notes: z.string().trim().max(200).optional(),
  package_id: z.string().trim().min(1),
  add_ons: z.array(z.string().trim().min(1)).default([]),
  requested_date: z.string().date(),
  requested_time_slot: z.string().regex(slot),
  is_asap: z.boolean().default(false),
  recurrence: z.enum(["none", "weekly", "biweekly", "monthly"]).default("none"),
  payment_method: z.enum(["cash", "card", "online"]).default("cash"),
  promo_code: z.string().trim().max(20).optional(),
  marketing_consent: z.boolean(),
  notes: z.string().trim().max(300).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
