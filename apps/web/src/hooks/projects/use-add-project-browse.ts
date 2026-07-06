import type { DirListing } from "@cyrus/connections/schemas/rtc/dir";
import {
	appendBrowsePathSegment,
	canNavigateUp,
	getBrowseDirectoryPath,
	getBrowseLeafPathSegment,
	getBrowseParentPath,
	hasTrailingPathSeparator,
	inferProjectTitleFromPath,
	isFilesystemBrowseQuery,
	isMacPlatform,
	isUnsupportedWindowsProjectPath,
	joinBrowseEntryPath,
	normalizeProjectPathForDispatch,
} from "@cyrus/utils/path";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useListDir } from "@/hooks/use-list-dir";
import { filterBrowseEntries } from "@/utils/dir";

const INITIAL_BROWSE_QUERY = "~/";

function isDirName(entry: DirListing[number]): entry is string {
	return typeof entry === "string";
}

function getAddProjectEmptyStateMessage(input: {
	isError: boolean;
	isLoading: boolean;
	willCreateProjectPath: boolean;
	filteredBrowseEntriesCount: number;
	browseFilterQueryLength: number;
}): string {
	if (input.isError) return "Unable to list this directory.";

	if (input.isLoading) return "Loading directories…";

	if (input.willCreateProjectPath)
		return "Press Enter to create this folder and add it as a project.";

	if (
		input.filteredBrowseEntriesCount === 0 &&
		input.browseFilterQueryLength > 0
	)
		return "No matching directories.";

	return "Enter a project path (e.g. ~/projects/my-app)";
}

function isPrimaryModifierPressed(
	event: KeyboardEvent<HTMLInputElement>,
	useMetaForMod: boolean
): boolean {
	return useMetaForMod
		? event.metaKey && !event.ctrlKey
		: event.ctrlKey && !event.metaKey;
}

type UseAddProjectBrowseOptions = {
	open: boolean;
	onCreate: (name: string, path: string) => Promise<unknown> | undefined;
	onOpenChange: (open: boolean) => void;
};

export function useAddProjectBrowse({
	open,
	onCreate,
	onOpenChange,
}: UseAddProjectBrowseOptions) {
	const [query, setQuery] = useState(INITIAL_BROWSE_QUERY);
	const [highlightedItemValue, setHighlightedItemValue] = useState<
		string | null
	>(null);
	const [browseGeneration, setBrowseGeneration] = useState(0);

	const browsePlatform =
		typeof navigator === "undefined" ? "Linux" : navigator.platform;
	const isBrowsing = isFilesystemBrowseQuery(query, browsePlatform);
	const browseDirectoryPath = isBrowsing ? getBrowseDirectoryPath(query) : "";
	const browseFilterQuery =
		isBrowsing && !hasTrailingPathSeparator(query)
			? getBrowseLeafPathSegment(query)
			: "";

	const listDirEnabled = isBrowsing && browseDirectoryPath.length > 0 && open;
	const { data, isLoading, isError } = useListDir(
		browseDirectoryPath,
		1,
		listDirEnabled
	);

	const browseEntries = useMemo(() => {
		const dirs = (data?.dirs ?? []).filter(isDirName);
		return dirs.map((name) => ({
			name,
			fullPath: joinBrowseEntryPath(browseDirectoryPath, name),
		}));
	}, [browseDirectoryPath, data?.dirs]);

	const {
		filteredEntries: filteredBrowseEntries,
		exactEntry: exactBrowseEntry,
	} = useMemo(
		() =>
			filterBrowseEntries({
				browseEntries,
				browseFilterQuery,
				highlightedItemValue,
			}),
		[browseEntries, browseFilterQuery, highlightedItemValue]
	);

	const reset = useCallback(() => {
		setQuery(INITIAL_BROWSE_QUERY);
		setHighlightedItemValue(null);
		setBrowseGeneration(0);
	}, []);

	useEffect(() => {
		if (!open) reset();
	}, [open, reset]);

	function browseUp() {
		const parentPath = getBrowseParentPath(query);
		if (parentPath === null) {
			return;
		}
		setHighlightedItemValue(null);
		setQuery(parentPath);
		setBrowseGeneration((generation) => generation + 1);
	}

	function browseTo(name: string) {
		setHighlightedItemValue(null);
		setQuery(appendBrowsePathSegment(query, name));
		setBrowseGeneration((generation) => generation + 1);
	}

	const canBrowseUp = isBrowsing && canNavigateUp(browseDirectoryPath);

	const browseParentPath = hasTrailingPathSeparator(query)
		? browseDirectoryPath
		: null;

	const resolvedAddProjectPath = hasTrailingPathSeparator(query)
		? normalizeProjectPathForDispatch(browseParentPath ?? query.trim())
		: normalizeProjectPathForDispatch(
				exactBrowseEntry?.fullPath ?? query.trim()
			);

	const hasHighlightedBrowseItem =
		highlightedItemValue?.startsWith("browse:") ?? false;
	const canSubmitBrowsePath = isBrowsing;
	const willCreateProjectPath =
		canSubmitBrowsePath &&
		!isLoading &&
		query.trim().length > 0 &&
		!hasHighlightedBrowseItem &&
		(hasTrailingPathSeparator(query) ? !isError : exactBrowseEntry === null);

	const useMetaForMod = isMacPlatform(browsePlatform);
	const submitModifierLabel = useMetaForMod ? "\u2318" : "Ctrl";
	const submitActionLabel = willCreateProjectPath ? "Create & Add" : "Add";
	const addShortcutLabel = hasHighlightedBrowseItem
		? `${submitModifierLabel} Enter`
		: "Enter";

	async function handleAddProject(rawPath: string) {
		const trimmedPath = rawPath.trim();
		if (trimmedPath.length === 0) {
			return;
		}

		if (isUnsupportedWindowsProjectPath(trimmedPath, browsePlatform)) {
			return;
		}

		const path = normalizeProjectPathForDispatch(trimmedPath);
		if (path.length === 0) {
			return;
		}

		const name = inferProjectTitleFromPath(path);
		await onCreate(name, path);
		reset();
		onOpenChange(false);
	}

	function submitAddProject(rawPath: string) {
		handleAddProject(rawPath).catch(() => undefined);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		const shouldSubmitBrowsePath =
			canSubmitBrowsePath &&
			event.key === "Enter" &&
			(!hasHighlightedBrowseItem ||
				isPrimaryModifierPressed(event, useMetaForMod));

		if (shouldSubmitBrowsePath) {
			event.preventDefault();
			submitAddProject(resolvedAddProjectPath);
		}
	}

	const emptyStateMessage = getAddProjectEmptyStateMessage({
		isError,
		isLoading,
		willCreateProjectPath,
		filteredBrowseEntriesCount: filteredBrowseEntries.length,
		browseFilterQueryLength: browseFilterQuery.length,
	});

	return {
		query,
		setQuery,
		highlightedItemValue,
		setHighlightedItemValue,
		browseGeneration,
		reset,
		browseUp,
		browseTo,
		canBrowseUp,
		filteredBrowseEntries,
		hasHighlightedBrowseItem,
		willCreateProjectPath,
		submitActionLabel,
		addShortcutLabel,
		submitModifierLabel,
		handleKeyDown,
		submitAddProject,
		resolvedAddProjectPath,
		emptyStateMessage,
	};
}
