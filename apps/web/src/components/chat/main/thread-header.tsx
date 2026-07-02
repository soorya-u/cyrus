"use client";

import type { Thread } from "@cyrus/hooks/types";
import { useChatUiStore } from "@/stores/chat-ui-store";
import { cn } from "@/utils/cn";

type ThreadHeaderProps = {
	thread: Thread;
	workerId: string;
	projectId: string;
};

export function ThreadHeader({
	thread,
	workerId,
	projectId,
}: ThreadHeaderProps) {
	const { diffOpen, toggleDiffOpen } = useChatUiStore();
	const contextLabel = `${workerId.slice(0, 8)}… / ${projectId.slice(0, 8)}…`;

	return (
		<div
			className={cn(
				"surface-subheader collapsed-sidebar-titlebar-inset px-3 transition-[padding-left] duration-200 ease-linear motion-reduce:transition-none"
			)}
		>
			<span className="truncate font-medium text-sm">{thread.title}</span>
			{thread.branch ? (
				<span className="ml-2 inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">
					<span className="size-1.5 rounded-full bg-emerald-500" />
					{thread.branch}
				</span>
			) : null}
			<span className="ml-2 truncate font-mono text-[10px] text-muted-foreground/70">
				{contextLabel}
			</span>
			<div className="ml-auto flex items-center gap-1">
				<button
					className={
						diffOpen
							? "inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 font-medium text-primary-foreground text-xs"
							: "inline-flex h-7 items-center gap-1 rounded-md bg-muted/70 px-2 font-medium text-foreground text-xs hover:bg-muted"
					}
					onClick={toggleDiffOpen}
					type="button"
				>
					Diffs
				</button>
			</div>
		</div>
	);
}
