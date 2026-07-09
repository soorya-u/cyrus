import { z } from "zod";

export const PlanEntryPrioritySchema = z.enum(["high", "medium", "low"]);

export const PlanEntryStatusSchema = z.enum([
	"pending",
	"in_progress",
	"completed",
]);

export type PlanEntryPriority = z.infer<typeof PlanEntryPrioritySchema>;
export type PlanEntryStatus = z.infer<typeof PlanEntryStatusSchema>;
