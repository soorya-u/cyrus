import { useGitStatus } from "@cyrus/hooks/queries/use-git";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FilePreview } from "@/components/chat/workspace/file-preview";
import {
	TREE_STATUS,
	TREE_THEME_STYLE,
} from "@/components/chat/workspace/tree-theme";
import { useDirectoryEntries } from "@/components/chat/workspace/use-directory-entries";
import { useTreePathSync } from "@/components/chat/workspace/use-tree-path-sync";

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

	const [openPath, setOpenPath] = useState<string | null>(null);

	const { model } = useFileTree({
		paths: [],
		onSelectionChange: (selectedPaths) => {
			const selected = selectedPaths.at(-1);
			if (selected && !selected.endsWith("/")) setOpenPath(selected);
		},
		density: "compact",
		initialExpansion: "closed",
		dragAndDrop: false,
		renaming: false,
		search: false,
	});

	useTreePathSync(model, treePaths, ready);

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

	const closePreview = () => {
		if (openPath) model.getItem(openPath)?.deselect();
		setOpenPath(null);
	};

	return (
		<div className="h-full w-full">
			<div className={openPath ? "hidden" : "h-full w-full"}>
				<FileTree
					className="h-full w-full"
					model={model}
					style={TREE_THEME_STYLE}
				/>
			</div>
			{openPath ? (
				<FilePreview
					onClose={closePreview}
					path={openPath}
					threadId={threadId}
				/>
			) : null}
		</div>
	);
}
