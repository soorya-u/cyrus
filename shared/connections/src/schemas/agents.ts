import { z } from "zod";

export const RegisteredAgentSchema = z.object({
	name: z.string(),
	command: z.string(),
	args: z.array(z.string()),
});

export const ProjectSchema = z.object({
	id: z.string(),
	cwd: z.string(),
	name: z.string().optional(),
});

export const ListAgentsOutputSchema = z.object({
	agents: z.array(RegisteredAgentSchema),
});

export const ListProjectsOutputSchema = z.object({
	projects: z.array(ProjectSchema),
});

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

export const ModelOptionSchema = SelectOptionSchema.extend({
	context: z.record(z.string(), z.unknown()).nullish(),
});

export const ListModelsOutputSchema = z.object({
	models: z.array(ModelOptionSchema),
});

export const ListModesOutputSchema = z.object({
	modes: z.array(SelectOptionSchema),
});

export const ListEffortsOutputSchema = z.object({
	efforts: z.array(SelectOptionSchema),
});

export const ListPersonasOutputSchema = z.object({
	personas: z.array(SelectOptionSchema),
});

export const SetModelInputSchema = AgentMutationInputSchema.extend({
	modelId: z.string(),
});

export const SetModeInputSchema = AgentMutationInputSchema.extend({
	modeId: z.string(),
});

export const SetEffortInputSchema = AgentMutationInputSchema.extend({
	effortId: z.string(),
});

export const SetPersonaInputSchema = AgentMutationInputSchema.extend({
	personaId: z.string(),
});

export const VoidOutputSchema = z.object({});

export type RegisteredAgent = z.infer<typeof RegisteredAgentSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ListAgentsOutput = z.infer<typeof ListAgentsOutputSchema>;
export type ListProjectsOutput = z.infer<typeof ListProjectsOutputSchema>;
export type AgentQueryInput = z.infer<typeof AgentQueryInputSchema>;
export type AgentMutationInput = z.infer<typeof AgentMutationInputSchema>;
export type ModelOption = z.infer<typeof ModelOptionSchema>;
export type SelectOption = z.infer<typeof SelectOptionSchema>;
