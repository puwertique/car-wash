import { z } from "zod";

export const registerWorkerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  phone: z.string().trim().min(5),
  city: z.string().trim().optional(),
  service_area: z.string().trim().optional(),
});

export type RegisterWorkerInput = z.infer<typeof registerWorkerSchema>;
