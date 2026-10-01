import { useGitPatch, useGitStatus } from "@cyrus/hooks/queries/use-git";
import type { GitFileChange } from "@cyrus/schemas/rtc/git";
import { PatchDiff } from "@pierre/diffs/react";
import { cn } from "cnfast";
import {
	ChevronDownIcon,
	ChevronRightIcon,
	ChevronsDownUpIcon,
	ChevronsUpDownIcon,
	GitBranchIcon,
	RefreshCwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PATCH_DIFF_OPTIONS } from "@/components/chat/workspace/patch-diff-options";
import { splitPatchByFile } from "@/components/chat/workspace/split-patch";
import {
	ADDED_LINES_COLOR,
	DELETED_LINES_COLOR,
	STATUS_LABEL,
} from "@/components/chat/workspace/tree-theme";
import { ScrollArea } from "@/components/ui/scroll-area";

// The file's header row already shows its path and line counts.
const DRAWER_PATCH_OPTIONS = { ...PATCH_DIFF_OPTIONS, disableFileHeader: true };

/** Above this many changed files, start collapsed so the view stays cheap. */
const EXPAND_ALL_LIMIT = 8;

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

function splitPath(path: string): { name: string; directory: string } {
	const slash = path.lastIndexOf("/");
	return slash === -1
		? { name: path, directory: "" }
		: { name: path.slice(slash + 1), directory: path.slice(0, slash) };
}

function FileSection({
	file,
	patch,
	expanded,
	onToggle,
}: {
	file: GitFileChange;
	patch: string | undefined;
	expanded: boolean;
	onToggle: () => void;
}) {
	const { name, directory } = splitPath(file.path);
	const label = STATUS_LABEL[file.status];
	const ChevronIcon = expanded ? ChevronDownIcon : ChevronRightIcon;

	return (
		<section className="border-border border-b">
			<button
				aria-expanded={expanded}
				className="sticky top-0 z-10 flex w-full items-center gap-2 bg-background px-2 py-1.5 text-left text-xs hover:bg-muted/60"
				onClick={onToggle}
				type="button"
			>
				<ChevronIcon className="size-3.5 shrink-0 text-muted-foreground" />
				<span
					className="w-3 shrink-0 text-center font-medium font-mono"
					style={{ color: label.color }}
					title={file.status}
				>
					{label.letter}
				</span>
				<span className="shrink-0 font-medium">{name}</span>
				{directory ? (
					<span className="min-w-0 truncate text-muted-foreground">
						{directory}
					</span>
				) : null}
				<span className="ml-auto shrink-0 pl-2">
					<LineCountLabels
						deletions={file.deletions}
						insertions={file.insertions}
					/>
				</span>
			</button>
			{expanded ? (
				<div className="diff-render-surface">
					{patch?.includes("\n@@") ? (
						<PatchDiff options={DRAWER_PATCH_OPTIONS} patch={patch} />
					) : (
						<p className="px-3 py-4 text-muted-foreground/70 text-xs">
							{patch?.includes("Binary files")
								? "Binary file — no text diff."
								: "No line changes."}
						</p>
					)}
				</div>
			) : null}
		</section>
	);
}

export function DiffTab({ threadId }: { threadId: string }) {
	const statusQuery = useGitStatus(threadId);
	const patchQuery = useGitPatch(threadId, undefined);
	const status = statusQuery.data;
	const files = useMemo(() => (status?.isRepo ? status.files : []), [status]);
	const patches = useMemo(
		() => splitPatchByFile(patchQuery.data?.patch ?? ""),
		[patchQuery.data]
	);
	const loading =
		statusQuery.isLoading ||
		statusQuery.isFetching ||
		patchQuery.isLoading ||
		patchQuery.isFetching;

	// Files the user flipped away from the default; the default depends on how
	// many files changed, so only deviations are stored.
	const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set());
	const expandedByDefault = files.length <= EXPAND_ALL_LIMIT;
	const isExpanded = (path: string) => expandedByDefault !== toggled.has(path);
	const allExpanded = files.every((file) => isExpanded(file.path));

	const toggle = (path: string) =>
		setToggled((previous) => {
			const next = new Set(previous);
			if (!next.delete(path)) next.add(path);
			return next;
		});
	const setAll = (expanded: boolean) =>
		setToggled(
			new Set(expanded === expandedByDefault ? [] : files.map((f) => f.path))
		);

	let body: React.ReactNode;
	if (files.length === 0) {
		body = (
			<p className="px-3 py-8 text-center text-muted-foreground/70 text-xs">
				No changes in working tree.
			</p>
		);
	} else if (patchQuery.isLoading) {
		body = (
			<p className="px-3 py-8 text-center text-muted-foreground/70 text-xs">
				Loading changes…
			</p>
		);
	} else {
		body = files.map((file) => (
			<FileSection
				expanded={isExpanded(file.path)}
				file={file}
				key={file.path}
				onToggle={() => toggle(file.path)}
				patch={patches.get(file.path)}
			/>
		));
	}

	return (
		<div className="flex h-full w-full flex-col">
			<div className="flex items-center gap-2 border-border border-b px-3 py-2">
				<GitBranchIcon className="size-3.5 text-muted-foreground" />
				<span className="font-medium text-sm">
					{status?.isRepo
						? (status.refName ?? "detached")
						: "Uncommitted changes"}
				</span>
				{status?.isRepo ? (
					<span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px]">
						<LineCountLabels
							deletions={status.deletions}
							insertions={status.insertions}
						/>
					</span>
				) : null}
				<div className="ml-auto flex items-center gap-1">
					{files.length > 0 ? (
						<button
							aria-label={
								allExpanded ? "Collapse all files" : "Expand all files"
							}
							className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
							onClick={() => setAll(!allExpanded)}
							type="button"
						>
							{allExpanded ? (
								<ChevronsDownUpIcon className="size-3.5" />
							) : (
								<ChevronsUpDownIcon className="size-3.5" />
							)}
						</button>
					) : null}
					<button
						aria-label="Sync diffs"
						className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
						onClick={() => {
							statusQuery.refetch();
							patchQuery.refetch();
						}}
						type="button"
					>
						<RefreshCwIcon
							className={cn("size-3.5", loading && "animate-spin")}
						/>
					</button>
				</div>
			</div>
			<ScrollArea className="min-h-0 flex-1">{body}</ScrollArea>
		</div>
	);
}
