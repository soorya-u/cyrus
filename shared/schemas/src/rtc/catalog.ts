import { z } from "zod";
import { AgentMutationInputSchema, SelectOptionSchema } from "./common";

export const ModelOptionSchema = SelectOptionSchema.extend({
	context: z.record(z.string(), z.unknown()).nullish(),
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
