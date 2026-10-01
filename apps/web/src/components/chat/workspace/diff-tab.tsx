import { useGitPatch, useGitStatus } from "@cyrus/hooks/queries/use-git";
import { PatchDiff } from "@pierre/diffs/react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { cn } from "cnfast";
import { ArrowLeftIcon, GitBranchIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PATCH_DIFF_OPTIONS } from "@/components/chat/workspace/patch-diff-options";
import {
	ADDED_LINES_COLOR,
	DELETED_LINES_COLOR,
	TREE_STATUS,
	TREE_THEME_STYLE,
} from "@/components/chat/workspace/tree-theme";
import { useTreePathSync } from "@/components/chat/workspace/use-tree-path-sync";
import { ScrollArea } from "@/components/ui/scroll-area";

// The back row above the diff already shows the path and line counts.
const DRAWER_PATCH_OPTIONS = { ...PATCH_DIFF_OPTIONS, disableFileHeader: true };

type LineCounts = { insertions: number; deletions: number };

/** Only the sides that changed, so a pure addition shows no "-0". */
function LineCountLabels({ insertions, deletions }: LineCounts) {
	if (insertions === 0 && deletions === 0) return null;
	return (
		<span className="font-mono tabular-nums">
			{insertions > 0 ? (
				<span style={{ color: ADDED_LINES_COLOR }}>+{insertions}</span>
			) : null}
			{insertions > 0 && deletions > 0 ? " " : null}
			{deletions > 0 ? (
				<span style={{ color: DELETED_LINES_COLOR }}>-{deletions}</span>
			) : null}
		</span>
	);
}

export function DiffTab({ threadId }: { threadId: string }) {
	const statusQuery = useGitStatus(threadId);
	const status = statusQuery.data;
	const files = useMemo(() => (status?.isRepo ? status.files : []), [status]);
	const [openPath, setOpenPath] = useState<string | null>(null);
	const patchQuery = useGitPatch(
		threadId,
		openPath ?? undefined,
		Boolean(openPath)
	);
	const loading = statusQuery.isLoading || statusQuery.isFetching;

	const countsRef = useRef(new Map<string, LineCounts>());
	countsRef.current = new Map(
		files.map((file) => [
			file.path,
			{ insertions: file.insertions, deletions: file.deletions },
		])
	);

	const { model } = useFileTree({
		paths: [],
		density: "compact",
		initialExpansion: "open",
		flattenEmptyDirectories: true,
		dragAndDrop: false,
		renaming: false,
		search: false,
		onSelectionChange: (selectedPaths) => {
			const selected = selectedPaths.at(-1);
			if (selected && !selected.endsWith("/")) setOpenPath(selected);
		},
		renderRowDecoration: ({ item, row }) => {
			if (row.kind === "directory") return null;
			const counts = countsRef.current.get(item.path);
			if (!counts || (counts.insertions === 0 && counts.deletions === 0)) {
				return null;
			}
			const parts = [
				counts.insertions > 0
					? { text: `+${counts.insertions}`, color: ADDED_LINES_COLOR }
					: null,
				counts.deletions > 0
					? {
							text: `${counts.insertions > 0 ? "\u00a0" : ""}-${counts.deletions}`,
							color: DELETED_LINES_COLOR,
						}
					: null,
			].filter((part) => part !== null);
			return { text: parts.map((part) => part.text).join(""), parts };
		},
	});

	const treePaths = useMemo(() => files.map((file) => file.path), [files]);
	useTreePathSync(model, treePaths);

	useEffect(() => {
		model.setGitStatus(
			files.map((file) => ({
				path: file.path,
				status: TREE_STATUS[file.status],
			}))
		);
	}, [files, model]);

	// A diff for a file that is no longer changed has nothing left to show.
	useEffect(() => {
		if (openPath && status && !files.some((file) => file.path === openPath)) {
			setOpenPath(null);
		}
	}, [files, openPath, status]);

	const closeDiff = () => {
		if (openPath) model.getItem(openPath)?.deselect();
		setOpenPath(null);
	};

	let patchContent: React.ReactNode;
	if (patchQuery.isLoading) {
		patchContent = (
			<p className="py-8 text-center text-muted-foreground/70 text-xs">
				Loading diff…
			</p>
		);
	} else if (patchQuery.data?.patch) {
		patchContent = (
			<PatchDiff
				className="h-full min-h-0 overflow-auto"
				options={DRAWER_PATCH_OPTIONS}
				patch={patchQuery.data.patch}
			/>
		);
	} else {
		patchContent = (
			<p className="py-8 text-center text-muted-foreground/70 text-xs">
				No patch for this file.
			</p>
		);
	}

	const openCounts = openPath ? countsRef.current.get(openPath) : undefined;

	return (
		<div className="flex h-full w-full flex-col">
			<div className="flex items-center gap-2 border-border border-b px-3 py-2">
				<GitBranchIcon className="size-3.5 text-muted-foreground" />
				<span className="font-medium text-sm">
					{status?.isRepo ? (status.refName ?? "detached") : "Diffs"}
				</span>
				{status?.isRepo ? (
					<span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px]">
						<LineCountLabels
							deletions={status.deletions}
							insertions={status.insertions}
						/>
					</span>
				) : null}
				<button
					aria-label="Sync diffs"
					className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					onClick={() => {
						statusQuery.refetch();
						if (openPath) patchQuery.refetch();
					}}
					type="button"
				>
					<RefreshCwIcon
						className={cn("size-3.5", loading && "animate-spin")}
					/>
				</button>
			</div>

			<div className={cn("min-h-0 flex-1", openPath && "hidden")}>
				{files.length === 0 ? (
					<p className="px-3 py-8 text-center text-muted-foreground/70 text-xs">
						No changes in working tree.
					</p>
				) : (
					<FileTree
						className="h-full w-full"
						model={model}
						style={TREE_THEME_STYLE}
					/>
				)}
			</div>

			{openPath ? (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="flex items-center gap-2 border-border border-b px-2 py-2">
						<button
							aria-label="Back to changes"
							className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
							onClick={closeDiff}
							type="button"
						>
							<ArrowLeftIcon className="size-4" />
						</button>
						<span
							className="min-w-0 truncate font-mono text-xs"
							title={openPath}
						>
							{openPath}
						</span>
						{openCounts ? (
							<span className="ml-auto shrink-0 text-[11px]">
								<LineCountLabels {...openCounts} />
							</span>
						) : null}
					</div>
					<ScrollArea className="min-h-0 flex-1">
						<div className="diff-render-surface min-h-full p-2">
							{patchContent}
						</div>
					</ScrollArea>
				</div>
			) : null}
		</div>
	);
}
