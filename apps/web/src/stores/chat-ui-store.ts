import { create } from "zustand";

type ChatUiState = {
	diffOpen: boolean;
	setDiffOpen: (open: boolean) => void;
	toggleDiffOpen: () => void;
};

export const useChatUiStore = create<ChatUiState>((set) => ({
	diffOpen: false,
	setDiffOpen: (open) => set({ diffOpen: open }),
	toggleDiffOpen: () => set((state) => ({ diffOpen: !state.diffOpen })),
}));
