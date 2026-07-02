import { eventIterator, oc } from "@orpc/contract";
import {
	AgentQueryInputSchema,
	ListAgentsOutputSchema,
	ListEffortsOutputSchema,
	ListModelsOutputSchema,
	ListModesOutputSchema,
	ListPersonasOutputSchema,
	ListProjectsOutputSchema,
	SetEffortInputSchema,
	SetModeInputSchema,
	SetModelInputSchema,
	SetPersonaInputSchema,
	VoidOutputSchema,
} from "../schemas/agents";
import { ChatChunkSchema, ChatInputSchema } from "../schemas/rtc";

export const controllerContract = {
	listAgents: oc.output(ListAgentsOutputSchema),
	listProjects: oc.output(ListProjectsOutputSchema),
	getModels: oc.input(AgentQueryInputSchema).output(ListModelsOutputSchema),
	getModes: oc.input(AgentQueryInputSchema).output(ListModesOutputSchema),
	getEfforts: oc.input(AgentQueryInputSchema).output(ListEffortsOutputSchema),
	getPersona: oc.input(AgentQueryInputSchema).output(ListPersonasOutputSchema),
	setModel: oc.input(SetModelInputSchema).output(VoidOutputSchema),
	setMode: oc.input(SetModeInputSchema).output(VoidOutputSchema),
	setEffort: oc.input(SetEffortInputSchema).output(VoidOutputSchema),
	setPersona: oc.input(SetPersonaInputSchema).output(VoidOutputSchema),
	chat: oc.input(ChatInputSchema).output(eventIterator(ChatChunkSchema)),
	subscribe: oc.output(eventIterator(ChatChunkSchema)),
};

export type ControllerContract = typeof controllerContract;
