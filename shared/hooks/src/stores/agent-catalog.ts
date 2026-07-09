import { create } from "zustand";

type ThreadCatalogSelection = {
	agentName?: string;
	modelId?: string;
	effortId?: string;
	personaId?: string;
};

type AgentCatalogState = {
	selectionByThread: Record<string, ThreadCatalogSelection>;
	setAgent: (threadId: string, agentName: string) => void;
	setModel: (threadId: string, modelId: string) => void;
	setEffort: (threadId: string, effortId: string) => void;
	setPersona: (threadId: string, personaId: string) => void;
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
	setAgent: (threadId, agentName) =>
		set((state) => patchSelection(state, threadId, { agentName })),
	setModel: (threadId, modelId) =>
		set((state) => patchSelection(state, threadId, { modelId })),
	setEffort: (threadId, effortId) =>
		set((state) => patchSelection(state, threadId, { effortId })),
	setPersona: (threadId, personaId) =>
		set((state) => patchSelection(state, threadId, { personaId })),
}));
