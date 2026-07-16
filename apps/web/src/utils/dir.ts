import { matchSorter } from "match-sorter";
import type { ReactNode } from "react";

export type FilesystemBrowseEntry = {
	name: string;
	fullPath: string;
};

export type BrowseActionItem = {
	readonly kind: "action";
	readonly value: string;
	readonly title: ReactNode;
	readonly icon: ReactNode;
	readonly keepOpen: true;
	readonly run: () => void;
};

export type BrowseGroup = {
	readonly value: string;
	readonly label: string;
	readonly items: readonly BrowseActionItem[];
};

export function filterBrowseEntries(input: {
	browseEntries: readonly FilesystemBrowseEntry[];
	browseFilterQuery: string;
	highlightedItemValue: string | null;
}): {
	filteredEntries: FilesystemBrowseEntry[];
	highlightedEntry: FilesystemBrowseEntry | null;
	exactEntry: FilesystemBrowseEntry | null;
} {
	const showHidden = input.browseFilterQuery.startsWith(".");

	const visibleEntries = input.browseEntries.filter(
		(entry) => showHidden || !entry.name.startsWith(".")
	);
	const filteredEntries = matchSorter(visibleEntries, input.browseFilterQuery, {
		keys: ["name"],
	});

	let highlightedEntry: FilesystemBrowseEntry | null = null;
	if (input.highlightedItemValue?.startsWith("browse:")) {
		const highlightedPath = input.highlightedItemValue.slice("browse:".length);
		highlightedEntry =
			filteredEntries.find((entry) => entry.fullPath === highlightedPath) ??
			null;
	}

	const exactEntry =
		input.browseFilterQuery.length > 0
			? (filteredEntries.find(
					(entry) => entry.name === input.browseFilterQuery
				) ?? null)
			: null;

	return { filteredEntries, highlightedEntry, exactEntry };
}

export function buildBrowseGroups(input: {
	browseEntries: readonly FilesystemBrowseEntry[];
	canBrowseUp: boolean;
	upIcon: ReactNode;
	directoryIcon: ReactNode;
	browseUp: () => void;
	browseTo: (name: string) => void;
}): BrowseGroup[] {
	const items: BrowseActionItem[] = [];

	if (input.canBrowseUp)
		items.push({
			kind: "action",
			value: "browse:up",
			title: "..",
			icon: input.upIcon,
			keepOpen: true,
			run: input.browseUp,
		});

	for (const entry of input.browseEntries)
		items.push({
			kind: "action",
			value: `browse:${entry.fullPath}`,
			title: entry.name,
			icon: input.directoryIcon,
			keepOpen: true,
			run: () => {
				input.browseTo(entry.name);
			},
		});

	return [{ value: "directories", label: "Directories", items }];
}
