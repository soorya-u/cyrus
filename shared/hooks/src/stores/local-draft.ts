import { create } from "zustand";

export type LocalDraftGitChoice = {
	branch?: string;
	worktree: boolean;
};

type LocalDraftState = {
	gitByDraft: Record<string, LocalDraftGitChoice>;
	setBranch: (draftId: string, branch: string) => void;
	setWorktree: (draftId: string, worktree: boolean) => void;
	clearDraft: (draftId: string) => void;
};

export const useLocalDraftStore = create<LocalDraftState>((set) => ({
	gitByDraft: {},
	setBranch: (draftId, branch) =>
		set((state) => ({
			gitByDraft: {
				...state.gitByDraft,
				[draftId]: {
					worktree: state.gitByDraft[draftId]?.worktree ?? false,
					branch,
				},
			},
		})),
	setWorktree: (draftId, worktree) =>
		set((state) => ({
			gitByDraft: {
				...state.gitByDraft,
				[draftId]: {
					branch: state.gitByDraft[draftId]?.branch,
					worktree,
				},
			},
		})),
	clearDraft: (draftId) =>
		set((state) => {
			const { [draftId]: _removed, ...rest } = state.gitByDraft;
			return { gitByDraft: rest };
		}),
}));
