import { ListAgentsOutputSchema } from "@cyrus/schemas/rtc/agents";
import {
	BindAgentInputSchema,
	BindAgentOutputSchema,
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
	ThreadCatalogQueryInputSchema,
	VoidOutputSchema,
} from "@cyrus/schemas/rtc/common";
import {
	ListDirInputSchema,
	ListDirOutputSchema,
} from "@cyrus/schemas/rtc/dir";
import {
	GitCheckoutInputSchema,
	GitCreateWorktreeInputSchema,
	GitCreateWorktreeOutputSchema,
	GitPatchInputSchema,
	GitPatchOutputSchema,
	GitRefsOutputSchema,
	GitRefsQueryInputSchema,
	GitStatusOutputSchema,
	ProjectGitRefsQueryInputSchema,
	ThreadGitQueryInputSchema,
} from "@cyrus/schemas/rtc/git";
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
	bindAgent: oc.input(BindAgentInputSchema).output(BindAgentOutputSchema),
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
	getModels: oc
		.input(ThreadCatalogQueryInputSchema)
		.output(ListModelsOutputSchema),
	getModes: oc
		.input(ThreadCatalogQueryInputSchema)
		.output(ListModesOutputSchema),
	getEfforts: oc
		.input(ThreadCatalogQueryInputSchema)
		.output(ListEffortsOutputSchema),
	getPersona: oc
		.input(ThreadCatalogQueryInputSchema)
		.output(ListPersonasOutputSchema),
	setModel: oc.input(SetModelInputSchema).output(VoidOutputSchema),
	setMode: oc.input(SetModeInputSchema).output(VoidOutputSchema),
	setEffort: oc.input(SetEffortInputSchema).output(VoidOutputSchema),
	setPersona: oc.input(SetPersonaInputSchema).output(VoidOutputSchema),
	chat: oc.input(ChatInputSchema).output(ChatOutputSchema),
	subscribe: oc.output(eventIterator(ChatChunkSchema)),
	watchThread: oc.input(WatchThreadInputSchema).output(WatchThreadOutputSchema),
	unwatchThread: oc.input(UnwatchThreadInputSchema).output(VoidOutputSchema),
	cancel: oc.input(CancelInputSchema).output(VoidOutputSchema),
	getGitStatus: oc
		.input(ThreadGitQueryInputSchema)
		.output(GitStatusOutputSchema),
	getGitPatch: oc.input(GitPatchInputSchema).output(GitPatchOutputSchema),
	listGitRefs: oc.input(GitRefsQueryInputSchema).output(GitRefsOutputSchema),
	checkoutGitRef: oc.input(GitCheckoutInputSchema).output(VoidOutputSchema),
	createGitWorktree: oc
		.input(GitCreateWorktreeInputSchema)
		.output(GitCreateWorktreeOutputSchema),
	removeGitWorktree: oc
		.input(ThreadGitQueryInputSchema)
		.output(VoidOutputSchema),
	getProjectGitStatus: oc
		.input(ProjectQueryInputSchema)
		.output(GitStatusOutputSchema),
	listProjectGitRefs: oc
		.input(ProjectGitRefsQueryInputSchema)
		.output(GitRefsOutputSchema),
};

export type ControllerContract = typeof controllerContract;
