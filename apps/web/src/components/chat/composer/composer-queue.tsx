import type { QueuedPrompt } from "@cyrus/hooks/stores/prompt-queue";
import { usePromptQueueStore } from "@cyrus/hooks/stores/prompt-queue";
import { formatPromptBlocks } from "@cyrus/schemas/rtc/chat";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const EMPTY_QUEUE: QueuedPrompt[] = [];

export function ComposerQueueChips({ threadId }: { threadId: string }) {
	const queue = usePromptQueueStore(
		(state) => state.queueByThread[threadId] ?? EMPTY_QUEUE
	);
	const remove = usePromptQueueStore((state) => state.remove);

	if (queue.length === 0) return null;

	return (
		<div className="mb-2 px-1">
			<p className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
				Queued messages
			</p>
			<div className="flex flex-wrap gap-1.5">
				{queue.map((item) => (
					<div
						className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background/80 px-2 py-1 text-xs backdrop-blur-sm"
						key={item.id}
					>
						<span className="truncate">{formatPromptBlocks(item.message)}</span>
						<Button
							aria-label="Remove queued message"
							className="size-4 p-0 text-muted-foreground hover:text-foreground"
							onClick={() => remove(threadId, item.id)}
							size="icon"
							type="button"
							variant="ghost"
						>
							<XIcon className="size-3" />
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
