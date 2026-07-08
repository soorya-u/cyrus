import { create } from "zustand";

type ChatUiState = {
	diffOpen: boolean;
	setDiffOpen: (open: boolean) => void;
	toggleDiffOpen: () => void;
	streamingThreadIds: Record<string, true>;
	setThreadStreaming: (threadId: string, streaming: boolean) => void;
};

export const useChatUiStore = create<ChatUiState>((set) => ({
	diffOpen: false,
	setDiffOpen: (open) => set({ diffOpen: open }),
	toggleDiffOpen: () => set((state) => ({ diffOpen: !state.diffOpen })),
	streamingThreadIds: {},
	setThreadStreaming: (threadId, streaming) =>
		set((state) => {
			const next = { ...state.streamingThreadIds };
			if (streaming) next[threadId] = true;
			else delete next[threadId];
			return { streamingThreadIds: next };
		}),
}));
