import { useGitPatch, useGitStatus } from "@cyrus/hooks/queries/use-git";
import { PatchDiff } from "@pierre/diffs/react";
import { cn } from "cnfast";
import { ChevronDownIcon, GitBranchIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { PATCH_DIFF_OPTIONS } from "@/components/chat/diff/patch-diff-options";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DiffPanel({
	threadId,
	onClose,
}: {
	threadId: string;
	onClose: () => void;
}) {
	const [selectedPath, setSelectedPath] = useState<string | undefined>();
	const statusQuery = useGitStatus(threadId);
	const patchQuery = useGitPatch(threadId, selectedPath, Boolean(selectedPath));

	useEffect(() => {
		const files = statusQuery.data?.isRepo ? statusQuery.data.files : [];
		if (files.length === 0) {
			setSelectedPath(undefined);
			return;
		}
		if (!(selectedPath && files.some((file) => file.path === selectedPath))) {
			setSelectedPath(files[0]?.path);
		}
	}, [selectedPath, statusQuery.data]);

	const status = statusQuery.data;
	const files = status?.isRepo ? status.files : [];
	const loading = statusQuery.isLoading || statusQuery.isFetching;

	let patchContent: React.ReactNode;
	if (!selectedPath) {
		patchContent = (
			<p className="py-8 text-center text-muted-foreground/70 text-xs">
				No changes in working tree.
			</p>
		);
	} else if (patchQuery.isLoading) {
		patchContent = (
			<p className="py-8 text-center text-muted-foreground/70 text-xs">
				Loading diff…
			</p>
		);
	} else if (patchQuery.data?.patch) {
		patchContent = (
			<PatchDiff
				className="h-full min-h-0 overflow-auto"
				options={PATCH_DIFF_OPTIONS}
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

	return (
		<div className="flex h-full w-full flex-col border-border border-l bg-card">
			<div className="flex items-center gap-2 border-border border-b px-3 py-2">
				<GitBranchIcon className="size-3.5 text-muted-foreground" />
				<span className="font-medium text-sm">
					{status?.isRepo ? (status.refName ?? "detached") : "Diffs"}
				</span>
				{status?.isRepo ? (
					<span className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
						+{status.insertions} / -{status.deletions}
					</span>
				) : null}
				<button
					aria-label="Sync diffs"
					className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					onClick={() => {
						statusQuery.refetch();
						if (selectedPath) patchQuery.refetch();
					}}
					type="button"
				>
					<RefreshCwIcon
						className={cn("size-3.5", loading && "animate-spin")}
					/>
				</button>
				<button
					aria-label="Close diff panel"
					className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					onClick={onClose}
					type="button"
				>
					<ChevronDownIcon className="size-4" />
				</button>
			</div>
			<div className="flex min-h-0 flex-1">
				<ScrollArea className="w-44 shrink-0 border-border border-r">
					<div className="flex flex-col gap-0.5 p-2">
						{files.length === 0 ? (
							<p className="px-1 py-2 text-[11px] text-muted-foreground/70">
								No changed files
							</p>
						) : (
							files.map((file) => (
								<button
									className={cn(
										"flex w-full flex-col rounded-md px-2 py-1.5 text-left text-[11px]",
										selectedPath === file.path
											? "bg-accent text-accent-foreground"
											: "hover:bg-muted/70"
									)}
									key={file.path}
									onClick={() => setSelectedPath(file.path)}
									type="button"
								>
									<span className="truncate font-mono">{file.path}</span>
									<span className="font-mono text-[10px] text-muted-foreground tabular-nums">
										+{file.insertions} / -{file.deletions}
									</span>
								</button>
							))
						)}
					</div>
				</ScrollArea>
				<ScrollArea className="min-w-0 flex-1">
					<div className="diff-render-surface min-h-full p-2">
						{patchContent}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
