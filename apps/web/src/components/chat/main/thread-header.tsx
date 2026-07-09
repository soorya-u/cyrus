import type { Thread } from "@cyrus/connections/schemas/rtc/threads";
import { cn } from "cnfast";
import { useChatUiStore } from "@/stores/chat-ui";

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
			<span className="truncate font-medium text-sm">{thread.name}</span>
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
