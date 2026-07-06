import { create } from "zustand";

type AgentCatalogState = {
	agentByThread: Record<string, string>;
	modelByThread: Record<string, string>;
	effortByThread: Record<string, string>;
	personaByThread: Record<string, string>;
	setAgent: (threadId: string, agentName: string) => void;
	setModel: (threadId: string, modelId: string) => void;
	setEffort: (threadId: string, effortId: string) => void;
	setPersona: (threadId: string, personaId: string) => void;
};

export const useAgentCatalogStore = create<AgentCatalogState>((set) => ({
	agentByThread: {},
	modelByThread: {},
	effortByThread: {},
	personaByThread: {},
	setAgent: (threadId, agentName) =>
		set((state) => ({
			agentByThread: { ...state.agentByThread, [threadId]: agentName },
		})),
	setModel: (threadId, modelId) =>
		set((state) => ({
			modelByThread: { ...state.modelByThread, [threadId]: modelId },
		})),
	setEffort: (threadId, effortId) =>
		set((state) => ({
			effortByThread: { ...state.effortByThread, [threadId]: effortId },
		})),
	setPersona: (threadId, personaId) =>
		set((state) => ({
			personaByThread: { ...state.personaByThread, [threadId]: personaId },
		})),
}));
