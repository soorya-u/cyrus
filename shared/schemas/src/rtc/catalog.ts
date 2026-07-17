import { z } from "zod";
import {
	AgentMutationInputSchema,
	optionalBoolean,
	SelectOptionSchema,
} from "./common";

export const BindAgentInputSchema = z.object({
	threadId: z.string(),
	projectId: z.string(),
	agentName: z.string(),
});

export const ModelOptionSchema = SelectOptionSchema.extend({
	context: z.record(z.string(), z.unknown()).nullish(),
});

export const AgentCapabilitiesSchema = z.record(z.string(), z.unknown());

export const AvailableCommandSchema = z.object({
	name: z.string(),
	description: z.string(),
	input: z.unknown().optional().nullable(),
});

export const ContextUsageSchema = z.object({
	used: z.number().min(0).optional(),
	limit: z.number().min(0).optional(),
});

export const GetContextUsageOutputSchema = z.object({
	usage: ContextUsageSchema.nullable(),
});

export const BindAgentOutputSchema = z.object({
	sessionId: z.string(),
	agentName: z.string(),
	agentLocked: optionalBoolean,
	capabilities: AgentCapabilitiesSchema,
	models: z.array(ModelOptionSchema),
	modes: z.array(SelectOptionSchema),
	efforts: z.array(SelectOptionSchema),
	personas: z.array(SelectOptionSchema),
	commands: z.array(AvailableCommandSchema).optional(),
});

export const GetDraftCatalogInputSchema = z.object({
	agentName: z.string(),
	projectId: z.string(),
});

export const GetDraftCatalogOutputSchema = z.object({
	capabilities: AgentCapabilitiesSchema,
	models: z.array(ModelOptionSchema),
	modes: z.array(SelectOptionSchema),
	efforts: z.array(SelectOptionSchema),
	personas: z.array(SelectOptionSchema),
	commands: z.array(AvailableCommandSchema).optional(),
});

export const ListModelsOutputSchema = z.object({
	models: z.array(ModelOptionSchema),
});

export const SetModelInputSchema = AgentMutationInputSchema.extend({
	modelId: z.string(),
});

export const ListModesOutputSchema = z.object({
	modes: z.array(SelectOptionSchema),
});

export const SetModeInputSchema = AgentMutationInputSchema.extend({
	modeId: z.string(),
});

export const ListEffortsOutputSchema = z.object({
	efforts: z.array(SelectOptionSchema),
});

export const SetEffortInputSchema = AgentMutationInputSchema.extend({
	effortId: z.string(),
});

export const ListPersonasOutputSchema = z.object({
	personas: z.array(SelectOptionSchema),
});

export const SetPersonaInputSchema = AgentMutationInputSchema.extend({
	personaId: z.string(),
});

export type ModelOption = z.infer<typeof ModelOptionSchema>;
export type AvailableCommand = z.infer<typeof AvailableCommandSchema>;
export type ContextUsage = z.infer<typeof ContextUsageSchema>;
export type GetContextUsageOutput = z.infer<typeof GetContextUsageOutputSchema>;
export type BindAgentInput = z.infer<typeof BindAgentInputSchema>;
export type BindAgentOutput = z.infer<typeof BindAgentOutputSchema>;
export type GetDraftCatalogInput = z.infer<typeof GetDraftCatalogInputSchema>;
export type GetDraftCatalogOutput = z.infer<typeof GetDraftCatalogOutputSchema>;
