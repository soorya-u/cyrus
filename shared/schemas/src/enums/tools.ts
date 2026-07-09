import { z } from "zod";

export const ToolCallStatusSchema = z.enum([
	"pending",
	"in_progress",
	"completed",
	"failed",
]);

export const ToolKindSchema = z.enum([
	"read",
	"edit",
	"delete",
	"move",
	"search",
	"execute",
	"think",
	"fetch",
	"switch_mode",
	"other",
]);

export type ToolCallStatus = z.infer<typeof ToolCallStatusSchema>;
export type ToolKind = z.infer<typeof ToolKindSchema>;
