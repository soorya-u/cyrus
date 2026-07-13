import type { DiffOptions } from "es-git";

export const WORKING_TREE_DIFF_OPTIONS: DiffOptions = {
	includeUntracked: true,
	showUntrackedContent: true,
	recurseUntrackedDirs: true,
};
