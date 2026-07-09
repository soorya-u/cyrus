import type { DiffView } from "@cyrus/schemas/view";
import { PatchDiff } from "@pierre/diffs/react";
import { ChevronDownIcon, ChevronRightIcon, GitBranchIcon } from "lucide-react";
import { useState } from "react";
import { PATCH_DIFF_OPTIONS } from "@/components/chat/diff/patch-diff-options";

export function DiffRow({ diff }: { diff: DiffView }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="overflow-hidden rounded-md border border-border/60 bg-card text-xs">
			<button
				className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				{open ? (
					<ChevronDownIcon className="size-3" />
				) : (
					<ChevronRightIcon className="size-3" />
				)}
				<GitBranchIcon className="size-3 text-muted-foreground" />
				<span className="truncate font-mono">{diff.path}</span>
				<span className="ml-auto inline-flex items-center gap-2 font-mono text-[11px] tabular-nums">
					<span className="text-emerald-600 dark:text-emerald-400">
						+{diff.additions}
					</span>
					<span className="text-red-600 dark:text-red-400">
						-{diff.deletions}
					</span>
				</span>
			</button>
			{open && (
				<div className="diff-render-surface max-h-80 overflow-auto border-border/60 border-t">
					<PatchDiff
						className="h-full min-h-0 overflow-auto"
						options={PATCH_DIFF_OPTIONS}
						patch={diff.patch}
					/>
				</div>
			)}
		</div>
	);
}
