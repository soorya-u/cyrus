export const SIGNALING_OPERATION_KEYS = {
	connection: (userId: string) => ["signaling", userId] as const,
	listPeers: ["signaling", "list-peers"],
} as const;

export const RTC_OPERATION_KEYS = {
	connection: (workerId: string) => ["controller", workerId] as const,
	listProjects: ["controller", "list-projects"],
	listThreads: (projectId: string) =>
		["controller", "list-threads", projectId] as const,
	listDir: (cwd: string, depth = 1) =>
		["controller", "list-dir", cwd, depth] as const,
	createProject: ["controller", "create-project"],
	createThread: ["controller", "create-thread"],
	renameProject: ["controller", "rename-project"],
	deleteProject: ["controller", "delete-project"],
	renameThread: ["controller", "rename-thread"],
	deleteThread: ["controller", "delete-thread"],
	getConversations: (threadId: string) =>
		["controller", "get-conversations", threadId] as const,
	listAgents: ["controller", "list-agents"],
	bindAgent: ["controller", "bind-agent"],
	getModels: (threadId: string) =>
		["controller", "get-models", threadId] as const,
	getModes: (threadId: string) =>
		["controller", "get-modes", threadId] as const,
	getEfforts: (threadId: string) =>
		["controller", "get-efforts", threadId] as const,
	getPersona: (threadId: string) =>
		["controller", "get-persona", threadId] as const,
	setModel: ["controller", "set-model"],
	setEffort: ["controller", "set-effort"],
	setPersona: ["controller", "set-persona"],
	watchThread: ["controller", "watch-thread"],
	unwatchThread: ["controller", "unwatch-thread"],
	getGitStatus: (threadId: string) =>
		["controller", "get-git-status", threadId] as const,
	getGitPatch: (threadId: string, path?: string) =>
		["controller", "get-git-patch", threadId, path ?? "all"] as const,
	listGitRefs: (threadId: string) =>
		["controller", "list-git-refs", threadId] as const,
	getProjectGitStatus: (projectId: string) =>
		["controller", "get-project-git-status", projectId] as const,
	listProjectGitRefs: (projectId: string) =>
		["controller", "list-project-git-refs", projectId] as const,
	checkoutGitRef: ["controller", "checkout-git-ref"],
	createGitWorktree: ["controller", "create-git-worktree"],
	removeGitWorktree: ["controller", "remove-git-worktree"],
	initGitRepository: ["controller", "init-git-repository"],
} as const;

export const AUTH_OPERATION_KEYS = {
	copySignInLink: ["auth", "copy-sign-in-link"],
	deviceDecide: ["auth", "device", "decide"],
} as const;
