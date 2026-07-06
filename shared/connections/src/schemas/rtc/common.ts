import { z } from "zod";

export const VoidOutputSchema = z.object({});

export const AgentQueryInputSchema = z.object({
	agentName: z.string(),
});

export const AgentMutationInputSchema = z.object({
	agentName: z.string(),
	threadId: z.uuidv7(),
	projectId: z.string(),
});

export const SelectOptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullish(),
});

export type AgentQueryInput = z.infer<typeof AgentQueryInputSchema>;
export type AgentMutationInput = z.infer<typeof AgentMutationInputSchema>;
export type SelectOption = z.infer<typeof SelectOptionSchema>;
