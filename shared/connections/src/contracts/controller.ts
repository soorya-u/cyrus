import { eventIterator, oc } from "@orpc/contract";
import { ListAgentsOutputSchema } from "../schemas/rtc/agents";
import {
	ListEffortsOutputSchema,
	ListModelsOutputSchema,
	ListModesOutputSchema,
	ListPersonasOutputSchema,
	SetEffortInputSchema,
	SetModeInputSchema,
	SetModelInputSchema,
	SetPersonaInputSchema,
} from "../schemas/rtc/catalog";
import { ChatChunkSchema, ChatInputSchema } from "../schemas/rtc/chat";
import { AgentQueryInputSchema, VoidOutputSchema } from "../schemas/rtc/common";
import { ListDirInputSchema, ListDirOutputSchema } from "../schemas/rtc/dir";
import {
	CreateProjectInputSchema,
	CreateProjectOutputSchema,
	DeleteProjectInputSchema,
	ListProjectsOutputSchema,
	RenameProjectInputSchema,
} from "../schemas/rtc/projects";
import {
	CreateThreadInputSchema,
	CreateThreadOutputSchema,
	GetConversationsOutputSchema,
	ListThreadsOutputSchema,
	ProjectQueryInputSchema,
	RenameThreadInputSchema,
	ThreadQueryInputSchema,
} from "../schemas/rtc/threads";

export const controllerContract = {
	listAgents: oc.output(ListAgentsOutputSchema),
	listProjects: oc.output(ListProjectsOutputSchema),
	createProject: oc
		.input(CreateProjectInputSchema)
		.output(CreateProjectOutputSchema),
	renameProject: oc.input(RenameProjectInputSchema).output(VoidOutputSchema),
	deleteProject: oc.input(DeleteProjectInputSchema).output(VoidOutputSchema),
	listDir: oc.input(ListDirInputSchema).output(ListDirOutputSchema),
	listThreads: oc
		.input(ProjectQueryInputSchema)
		.output(ListThreadsOutputSchema),
	createThread: oc
		.input(CreateThreadInputSchema)
		.output(CreateThreadOutputSchema),
	getConversations: oc
		.input(ThreadQueryInputSchema)
		.output(GetConversationsOutputSchema),
	deleteThread: oc.input(ThreadQueryInputSchema).output(VoidOutputSchema),
	renameThread: oc.input(RenameThreadInputSchema).output(VoidOutputSchema),
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
