import { z } from "zod";

const phoneNumber = /^\+212[5-7]\d{8}$/;
const uploadFile = z.custom<File>(
  (value) => {
    if (!value || typeof value !== "object") return false;
    const candidate = value as { size?: unknown; arrayBuffer?: unknown };
    return typeof candidate.size === "number" && candidate.size > 0 && typeof candidate.arrayBuffer === "function";
  },
  "A non-empty file is required.",
);

export const registerWorkerSchema = z.object({
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(6),
  phone: z.string().trim().regex(phoneNumber),
  city: z.string().trim().min(1),
  compensation_model: z.enum(["percentage", "fixed_per_booking", "salary"]),
  compensation_value: z.coerce.number().positive(),
  work_vehicle_type: z.enum(["tricycle_motorcycle", "van"]),
  vehicle_plate_number: z.string().trim().min(1),
  cin_number: z.string().trim().optional(),
  full_address: z.string().trim().optional(),
  birth_date: z.string().date().optional(),
  eligible_package_ids: z.array(z.string().uuid()).optional(),
  vehicle_photo: uploadFile,
  carte_grise_photo: uploadFile,
  cin_photo: uploadFile.optional(),
  portrait: uploadFile.optional(),
  employment_contract: uploadFile.optional(),
  insurance_photo: uploadFile.optional(),
}).superRefine((value, context) => {
  if (value.compensation_model === "percentage" && value.compensation_value > 100) {
    context.addIssue({ code: "custom", path: ["compensation_value"], message: "Percentage must be between 0 and 100." });
  }
});

export type RegisterWorkerInput = z.infer<typeof registerWorkerSchema>;
