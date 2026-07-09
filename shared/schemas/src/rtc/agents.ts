import { z } from "zod";

export const RegisteredAgentSchema = z.object({
	name: z.string(),
	command: z.string(),
	args: z.array(z.string()),
});

export const ListAgentsOutputSchema = z.object({
	agents: z.array(RegisteredAgentSchema),
});

export type RegisteredAgent = z.infer<typeof RegisteredAgentSchema>;
export type ListAgentsOutput = z.infer<typeof ListAgentsOutputSchema>;
