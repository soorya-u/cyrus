import { create } from "zustand";

export const DEFAULT_DRAWER_SIZE = 40;

export type WorkspaceTab = "explorer" | "diff";

type ChatUiState = {
	drawerOpen: boolean;
	setDrawerOpen: (open: boolean) => void;
	toggleDrawerOpen: () => void;
	/** Workspace drawer width as a percentage of the chat area, kept across close/reopen. */
	drawerSize: number;
	setDrawerSize: (size: number) => void;
	workspaceTab: WorkspaceTab;
	setWorkspaceTab: (tab: WorkspaceTab) => void;
};

export const useChatUiStore = create<ChatUiState>((set) => ({
	drawerOpen: false,
	setDrawerOpen: (open) => set({ drawerOpen: open }),
	toggleDrawerOpen: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
	drawerSize: DEFAULT_DRAWER_SIZE,
	setDrawerSize: (size) => set({ drawerSize: size }),
	workspaceTab: "explorer",
	setWorkspaceTab: (tab) => set({ workspaceTab: tab }),
}));
