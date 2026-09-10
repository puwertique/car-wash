import { z } from "zod";

export const createOrderSchema = z.object({
  customer_name: z.string().trim().min(1),
  phone: z.string().trim().min(5),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  vehicle_type: z.string().trim().optional(),
  vehicle_size: z.string().trim().optional(),
  package_type: z.string().trim().optional(),
  service_id: z.string().uuid(),
  notes: z.string().trim().optional(),
  scheduled_at: z.string().datetime().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
