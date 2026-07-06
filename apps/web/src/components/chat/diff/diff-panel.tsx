import type { Thread } from "@cyrus/hooks/types";
import { PatchDiff } from "@pierre/diffs/react";
import { ChevronDownIcon, GitBranchIcon } from "lucide-react";
import { PATCH_DIFF_OPTIONS } from "@/components/chat/diff/patch-diff-options";
import { ScrollArea } from "@/components/ui/scroll-area";

export function DiffPanel({
	thread,
	onClose,
}: {
	thread: Thread;
	onClose: () => void;
}) {
	const diffs = thread.diffs ?? [];
	const turns = thread.turns ?? [];

	let diffPanelContent: React.ReactNode;
	if (diffs.length === 0) {
		diffPanelContent = (
			<p className="py-8 text-center text-muted-foreground/70 text-xs">
				No diffs produced yet.
			</p>
		);
	} else {
		diffPanelContent = turns
			.map((turn) => ({
				turn,
				ds: diffs.filter((d) => d.turnId === turn.id),
			}))
			.filter((g) => g.ds.length > 0)
			.map(({ turn, ds }) => {
				const additions = ds.reduce((n, d) => n + d.additions, 0);
				const deletions = ds.reduce((n, d) => n + d.deletions, 0);
				return (
					<div className="flex flex-col gap-1.5" key={turn.id}>
						<div className="flex items-center gap-2 font-medium text-[11px] text-muted-foreground">
							<span>Turn {turn.index}</span>
							<span className="font-mono tabular-nums">
								+{additions} / -{deletions}
							</span>
						</div>
						{ds.map((d) => (
							<div
								className="diff-render-surface overflow-hidden rounded-md border border-border/60 bg-card"
								key={d.id}
							>
								<PatchDiff
									className="h-full min-h-0 overflow-auto"
									options={PATCH_DIFF_OPTIONS}
									patch={d.patch}
								/>
							</div>
						))}
					</div>
				);
			});
	}

	return (
		<div className="flex h-full w-full flex-col border-border border-l bg-card">
			<div className="flex items-center gap-2 border-border border-b px-3 py-2">
				<GitBranchIcon className="size-3.5 text-muted-foreground" />
				<span className="font-medium text-sm">Diffs</span>
				<span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">
					{diffs.length} files
				</span>
				<button
					aria-label="Close diff panel"
					className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
					onClick={onClose}
					type="button"
				>
					<ChevronDownIcon className="size-4" />
				</button>
			</div>
			<ScrollArea className="flex-1">
				<div className="flex flex-col gap-2 p-3">{diffPanelContent}</div>
			</ScrollArea>
		</div>
	);
}
