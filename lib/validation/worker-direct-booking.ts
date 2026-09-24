import { z } from "zod";

const phoneNumber = /^\+212[5-7]\d{8}$/;

export const workerDirectBookingSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  customer_phone: z.string().trim().regex(phoneNumber),
  package_id: z.string().trim().min(1),
  vehicle_size: z.enum(["citadine", "berline", "suv_medium", "suv_large", "moto_small", "moto_large"]),
  payment_method: z.enum(["cash", "card", "online"]),
});

export type WorkerDirectBookingInput = z.infer<typeof workerDirectBookingSchema>;
