import { z } from "zod";

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meters: z.number().nonnegative().optional(),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
