import { z } from "zod";

export const optionalString = z
	.string()
	.nullish()
	.transform((value) => value ?? undefined);

export const optionalBoolean = z
	.union([z.boolean(), z.number()])
	.nullish()
	.transform((value) => (value ? true : undefined));

export const VoidOutputSchema = z.object({});

export const AgentQueryInputSchema = z.object({
	agentName: z.string(),
});

export const ThreadCatalogQueryInputSchema = z.object({
	threadId: z.string(),
});

export const AgentMutationInputSchema = z.object({
	agentName: z.string(),
	threadId: z.uuid(),
	projectId: z.string(),
});

export const SelectOptionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullish(),
});

export type AgentQueryInput = z.infer<typeof AgentQueryInputSchema>;
export type ThreadCatalogQueryInput = z.infer<
	typeof ThreadCatalogQueryInputSchema
>;
export type AgentMutationInput = z.infer<typeof AgentMutationInputSchema>;
export type SelectOption = z.infer<typeof SelectOptionSchema>;
