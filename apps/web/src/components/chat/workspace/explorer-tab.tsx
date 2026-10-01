import { useGitStatus } from "@cyrus/hooks/queries/use-git";
import type { GitFileStatus } from "@cyrus/schemas/rtc/git";
import type { GitStatusEntry } from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { useEffect, useMemo, useRef } from "react";
import { buildFileTreePathUpdates } from "@/components/chat/workspace/file-tree-path-updates";
import { useDirectoryEntries } from "@/components/chat/workspace/use-directory-entries";

const TREE_STATUS: Record<GitFileStatus, GitStatusEntry["status"]> = {
	Added: "added",
	Deleted: "deleted",
	Modified: "modified",
	Renamed: "renamed",
	Untracked: "untracked",
};

function parentOf(path: string): string {
	return path.slice(0, Math.max(0, path.lastIndexOf("/")));
}

export function ExplorerTab({ threadId }: { threadId: string }) {
	const { entries, load, refresh, ready, error } =
		useDirectoryEntries(threadId);
	const statusQuery = useGitStatus(threadId);
	const changes = useMemo(
		() => (statusQuery.data?.isRepo ? statusQuery.data.files : []),
		[statusQuery.data]
	);

	const treePaths = useMemo(() => {
		const loadedDirectories = new Set([
			"",
			...entries.filter((e) => e.kind === "directory").map((e) => e.path),
		]);
		const known = new Set(entries.map((entry) => entry.path));
		const paths = entries.map((entry) =>
			entry.kind === "directory" ? `${entry.path}/` : entry.path
		);
		// Deleted files are gone from disk, so surface them from git status.
		for (const change of changes) {
			if (
				change.status === "Deleted" &&
				!known.has(change.path) &&
				loadedDirectories.has(parentOf(change.path))
			) {
				paths.push(change.path);
			}
		}
		return paths;
	}, [entries, changes]);

	const directoryPaths = useMemo(
		() => treePaths.filter((path) => path.endsWith("/")),
		[treePaths]
	);

	// Git status is invalidated at turn end and by manual sync; reload the
	// already-visited folders whenever it refreshes so new/removed files appear.
	const statusUpdatedAt = statusQuery.dataUpdatedAt;
	const seenStatusUpdateRef = useRef(statusUpdatedAt);
	useEffect(() => {
		if (seenStatusUpdateRef.current === statusUpdatedAt) return;
		seenStatusUpdateRef.current = statusUpdatedAt;
		refresh();
	}, [statusUpdatedAt, refresh]);

	const { model } = useFileTree({
		paths: [],
		density: "compact",
		initialExpansion: "closed",
		dragAndDrop: false,
		renaming: false,
		search: false,
	});

	const previousPathsRef = useRef<readonly string[] | null>(null);
	useEffect(() => {
		if (!ready || previousPathsRef.current === treePaths) return;
		const previous = previousPathsRef.current;
		previousPathsRef.current = treePaths;
		if (previous === null) {
			model.resetPaths(treePaths);
			return;
		}
		const updates = buildFileTreePathUpdates(previous, treePaths);
		if (updates.length > 0) model.batch(updates);
	}, [ready, model, treePaths]);

	// The tree has no expand callback, so load a folder's children the first
	// time it is seen expanded.
	const expandedRef = useRef(new Set<string>());
	useEffect(() => {
		const loadExpanded = () => {
			for (const path of directoryPaths) {
				const item = model.getItem(path);
				const expanded =
					item?.isDirectory() === true &&
					"isExpanded" in item &&
					item.isExpanded();
				if (expanded && !expandedRef.current.has(path)) {
					expandedRef.current.add(path);
					load(path.slice(0, -1));
				} else if (!expanded) {
					expandedRef.current.delete(path);
				}
			}
		};
		loadExpanded();
		return model.subscribe(loadExpanded);
	}, [directoryPaths, load, model]);

	useEffect(() => {
		model.setGitStatus(
			changes.map((change) => ({
				path: change.path,
				status: TREE_STATUS[change.status],
			}))
		);
	}, [changes, model]);

	if (error && !ready) {
		return (
			<p className="px-3 py-4 text-center text-destructive text-xs">{error}</p>
		);
	}

	return <FileTree className="h-full w-full" model={model} />;
}
