export const SIGNALING_OPERATION_KEYS = {
	listPeers: ["signaling", "list-peers"],
};

export const RTC_OPERATION_KEYS = {
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
	getModels: (agentName: string) =>
		["controller", "get-models", agentName] as const,
	getEfforts: (agentName: string) =>
		["controller", "get-efforts", agentName] as const,
	getPersona: (agentName: string) =>
		["controller", "get-persona", agentName] as const,
	setModel: ["controller", "set-model"],
	setEffort: ["controller", "set-effort"],
	setPersona: ["controller", "set-persona"],
};

export const AUTH_OPERATION_KEYS = {
	copySignInLink: ["auth", "copy-sign-in-link"],
	deviceDecide: ["auth", "device", "decide"],
};
