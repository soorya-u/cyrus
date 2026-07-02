import { z } from "zod";
import { commandSchema } from "./acp";

export const agentEntrySchema = z.object({
	command: commandSchema,
	args: z.array(z.string()).default([]),
});

export type AgentEntry = z.infer<typeof agentEntrySchema>;
