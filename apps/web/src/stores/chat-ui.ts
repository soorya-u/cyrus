import { create } from "zustand";

export type WorkspaceTab = "explorer" | "diff";

type ChatUiState = {
	drawerOpen: boolean;
	setDrawerOpen: (open: boolean) => void;
	toggleDrawerOpen: () => void;
	workspaceTab: WorkspaceTab;
	setWorkspaceTab: (tab: WorkspaceTab) => void;
};

export const useChatUiStore = create<ChatUiState>((set) => ({
	drawerOpen: false,
	setDrawerOpen: (open) => set({ drawerOpen: open }),
	toggleDrawerOpen: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
	workspaceTab: "explorer",
	setWorkspaceTab: (tab) => set({ workspaceTab: tab }),
}));
