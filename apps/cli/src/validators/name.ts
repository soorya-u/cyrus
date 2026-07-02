import { z } from "zod";

export const nameSchema = z
	.string()
	.min(1, "name cannot be empty")
	.max(64, "name is too long (max 64 characters)")
	.regex(
		/^[a-zA-Z0-9_-]+$/,
		"name may only contain letters, numbers, hyphens and underscores"
	);

export type AgentName = z.infer<typeof nameSchema>;
