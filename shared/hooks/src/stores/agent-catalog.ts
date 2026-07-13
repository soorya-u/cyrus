import { create } from "zustand";

type ThreadCatalogSelection = {
	modelId?: string;
	effortId?: string;
	personaId?: string;
};

type AgentCatalogState = {
	selectionByThread: Record<string, ThreadCatalogSelection>;
	pendingAgentByThread: Record<string, string | undefined>;
	resumeBindRequestedByThread: Record<string, boolean>;
	setModel: (threadId: string, modelId: string) => void;
	setEffort: (threadId: string, effortId: string) => void;
	setPersona: (threadId: string, personaId: string) => void;
	setPendingAgent: (threadId: string, agentName: string) => void;
	clearPendingAgent: (threadId: string) => void;
	markResumeBindRequested: (threadId: string) => void;
	clearResumeBindRequested: (threadId: string) => void;
};

function patchSelection(
	state: AgentCatalogState,
	threadId: string,
	patch: Partial<ThreadCatalogSelection>
): Pick<AgentCatalogState, "selectionByThread"> {
	return {
		selectionByThread: {
			...state.selectionByThread,
			[threadId]: { ...state.selectionByThread[threadId], ...patch },
		},
	};
}

export const useAgentCatalogStore = create<AgentCatalogState>((set) => ({
	selectionByThread: {},
	pendingAgentByThread: {},
	resumeBindRequestedByThread: {},
	setModel: (threadId, modelId) =>
		set((state) => patchSelection(state, threadId, { modelId })),
	setEffort: (threadId, effortId) =>
		set((state) => patchSelection(state, threadId, { effortId })),
	setPersona: (threadId, personaId) =>
		set((state) => patchSelection(state, threadId, { personaId })),
	setPendingAgent: (threadId, agentName) =>
		set((state) => ({
			pendingAgentByThread: {
				...state.pendingAgentByThread,
				[threadId]: agentName,
			},
		})),
	clearPendingAgent: (threadId) =>
		set((state) => {
			const { [threadId]: _removed, ...pendingAgentByThread } =
				state.pendingAgentByThread;
			return { pendingAgentByThread };
		}),
	markResumeBindRequested: (threadId) =>
		set((state) => ({
			resumeBindRequestedByThread: {
				...state.resumeBindRequestedByThread,
				[threadId]: true,
			},
		})),
	clearResumeBindRequested: (threadId) =>
		set((state) => {
			const { [threadId]: _removed, ...resumeBindRequestedByThread } =
				state.resumeBindRequestedByThread;
			return { resumeBindRequestedByThread };
		}),
}));
