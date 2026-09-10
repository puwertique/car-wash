import { z } from "zod";

// Manual worker-initiated transitions only. BUSY is set by the order
// lifecycle (dispatch/order flow), never chosen directly by a worker.
export const workerManualStatusSchema = z.enum(["OFFLINE", "AVAILABLE"]);

export type WorkerManualStatus = z.infer<typeof workerManualStatusSchema>;
