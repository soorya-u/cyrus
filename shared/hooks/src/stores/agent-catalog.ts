import type {
	AvailableCommand,
	ContextUsage,
} from "@cyrus/schemas/rtc/catalog";
import { create } from "zustand";

type ThreadCatalogSelection = {
	modelId?: string;
	modeId?: string;
	effortId?: string;
	personaId?: string;
};

type LiveThreadBinding = {
	agentName: string;
	sessionId: string;
};

type AgentCatalogState = {
	selectionByThread: Record<string, ThreadCatalogSelection>;
	capabilitiesByThread: Record<string, Record<string, unknown>>;
	commandsByThread: Record<string, AvailableCommand[]>;
	contextUsageByThread: Record<string, ContextUsage | null>;
	pendingAgentByThread: Record<string, string | undefined>;
	liveBindingByThread: Record<string, LiveThreadBinding | undefined>;
	setModel: (threadId: string, modelId: string) => void;
	setMode: (threadId: string, modeId: string) => void;
	setEffort: (threadId: string, effortId: string) => void;
	setPersona: (threadId: string, personaId: string) => void;
	setCapabilities: (
		threadId: string,
		capabilities: Record<string, unknown>
	) => void;
	setCommands: (threadId: string, commands: AvailableCommand[]) => void;
	setContextUsage: (threadId: string, usage: ContextUsage | null) => void;
	setPendingAgent: (threadId: string, agentName: string) => void;
	clearPendingAgent: (threadId: string) => void;
	setLiveBinding: (threadId: string, binding: LiveThreadBinding) => void;
	clearLiveBinding: (threadId: string) => void;
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
	capabilitiesByThread: {},
	commandsByThread: {},
	contextUsageByThread: {},
	pendingAgentByThread: {},
	liveBindingByThread: {},
	setModel: (threadId, modelId) =>
		set((state) => {
			if (state.selectionByThread[threadId]?.modelId === modelId) {
				return state;
			}
			return patchSelection(state, threadId, { modelId });
		}),
	setMode: (threadId, modeId) =>
		set((state) => {
			if (state.selectionByThread[threadId]?.modeId === modeId) {
				return state;
			}
			return patchSelection(state, threadId, { modeId });
		}),
	setEffort: (threadId, effortId) =>
		set((state) => {
			if (state.selectionByThread[threadId]?.effortId === effortId) {
				return state;
			}
			return patchSelection(state, threadId, { effortId });
		}),
	setPersona: (threadId, personaId) =>
		set((state) => {
			if (state.selectionByThread[threadId]?.personaId === personaId) {
				return state;
			}
			return patchSelection(state, threadId, { personaId });
		}),
	setCapabilities: (threadId, capabilities) =>
		set((state) => ({
			capabilitiesByThread: {
				...state.capabilitiesByThread,
				[threadId]: capabilities,
			},
		})),
	setCommands: (threadId, commands) =>
		set((state) => ({
			commandsByThread: {
				...state.commandsByThread,
				[threadId]: commands,
			},
		})),
	setContextUsage: (threadId, usage) =>
		set((state) => {
			const current = state.contextUsageByThread[threadId];
			if (current === usage) return state;
			if (
				current != null &&
				usage != null &&
				current.used === usage.used &&
				current.limit === usage.limit
			) {
				return state;
			}
			if (current == null && usage == null) return state;
			return {
				contextUsageByThread: {
					...state.contextUsageByThread,
					[threadId]: usage,
				},
			};
		}),
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
	setLiveBinding: (threadId, binding) =>
		set((state) => {
			const current = state.liveBindingByThread[threadId];
			if (
				current?.agentName === binding.agentName &&
				current.sessionId === binding.sessionId
			) {
				return state;
			}
			return {
				liveBindingByThread: {
					...state.liveBindingByThread,
					[threadId]: binding,
				},
			};
		}),
	clearLiveBinding: (threadId) =>
		set((state) => {
			if (!(threadId in state.liveBindingByThread)) return state;
			const { [threadId]: _removed, ...liveBindingByThread } =
				state.liveBindingByThread;
			return { liveBindingByThread };
		}),
}));

type PromptCapabilities = {
	image?: boolean;
	audio?: boolean;
	embeddedContext?: boolean;
};

export function readPromptCapabilities(
	capabilities: Record<string, unknown> | undefined
): PromptCapabilities {
	const promptCapabilities = capabilities?.promptCapabilities;
	if (!promptCapabilities || typeof promptCapabilities !== "object") {
		return {};
	}

	const record = promptCapabilities as Record<string, unknown>;
	return {
		image: record.image === true,
		audio: record.audio === true,
		embeddedContext: record.embeddedContext === true,
	};
}

/** Whether agent capabilities advertise ACP elicitation support. */
export function supportsElicitation(
	capabilities: Record<string, unknown> | undefined
): boolean {
	if (!capabilities) return false;
	if (capabilities.elicitation === true) return true;

	const nested = capabilities.agentCapabilities;
	if (nested && typeof nested === "object") {
		const record = nested as Record<string, unknown>;
		if (record.elicitation === true) return true;
	}

	return false;
}
