import { z } from "zod";

export const RegisteredAgentSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.url(),
});

export const ListAgentsOutputSchema = z.object({
	agents: z.array(RegisteredAgentSchema),
});

export type RegisteredAgent = z.infer<typeof RegisteredAgentSchema>;
export type ListAgentsOutput = z.infer<typeof ListAgentsOutputSchema>;
