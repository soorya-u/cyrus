import { z } from "zod";
import { registryIdSchema } from "./registry-id";

export const agentEntrySchema = z.object({
	registryId: registryIdSchema,
	name: z.string().min(1),
	icon: z.url(),
});

export type AgentEntry = z.infer<typeof agentEntrySchema>;
