import { ListAgentsOutputSchema } from "@cyrus/schemas/rtc/agents";
import {
	ListEffortsOutputSchema,
	ListModelsOutputSchema,
	ListModesOutputSchema,
	ListPersonasOutputSchema,
	SetEffortInputSchema,
	SetModeInputSchema,
	SetModelInputSchema,
	SetPersonaInputSchema,
} from "@cyrus/schemas/rtc/catalog";
import {
	CancelInputSchema,
	ChatChunkSchema,
	ChatInputSchema,
	ChatOutputSchema,
} from "@cyrus/schemas/rtc/chat";
import {
	AgentQueryInputSchema,
	VoidOutputSchema,
} from "@cyrus/schemas/rtc/common";
import {
	ListDirInputSchema,
	ListDirOutputSchema,
} from "@cyrus/schemas/rtc/dir";
import {
	CreateProjectInputSchema,
	CreateProjectOutputSchema,
	DeleteProjectInputSchema,
	ListProjectsOutputSchema,
	RenameProjectInputSchema,
} from "@cyrus/schemas/rtc/projects";
import {
	CreateThreadInputSchema,
	CreateThreadOutputSchema,
	GetConversationsOutputSchema,
	ListThreadsOutputSchema,
	ProjectQueryInputSchema,
	RenameThreadInputSchema,
	ThreadQueryInputSchema,
	UnwatchThreadInputSchema,
	WatchThreadInputSchema,
	WatchThreadOutputSchema,
} from "@cyrus/schemas/rtc/threads";
import { eventIterator, oc } from "@orpc/contract";

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
	chat: oc.input(ChatInputSchema).output(ChatOutputSchema),
	subscribe: oc.output(eventIterator(ChatChunkSchema)),
	watchThread: oc.input(WatchThreadInputSchema).output(WatchThreadOutputSchema),
	unwatchThread: oc.input(UnwatchThreadInputSchema).output(VoidOutputSchema),
	cancel: oc.input(CancelInputSchema).output(VoidOutputSchema),
};

export type ControllerContract = typeof controllerContract;
