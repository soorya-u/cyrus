import { useThreadFeed } from "@cyrus/hooks/use-thread-feed";
import type { ThreadConversation } from "@cyrus/schemas/view";
import { cn } from "cnfast";
import { useEffect, useEffectEvent, useRef } from "react";
import { FeedEntryView } from "@/components/chat/feed/feed-entry-view";
import { ScrollArea } from "@/components/ui/scroll-area";

function scrollFeedToBottom(root: HTMLElement | null): void {
	const viewport = root?.querySelector<HTMLElement>(
		'[data-slot="scroll-area-viewport"]'
	);
	if (!viewport) return;
	viewport.scrollTop = viewport.scrollHeight;
}

export function ChatFeed({
	conversation,
	activeTurnId,
	className,
}: {
	conversation: ThreadConversation;
	activeTurnId?: string;
	className?: string;
}) {
	const feed = useThreadFeed(conversation, activeTurnId);
	const rootRef = useRef<HTMLDivElement | null>(null);

	const scrollToBottom = useEffectEvent(() => {
		scrollFeedToBottom(rootRef.current);
	});

	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			requestAnimationFrame(() => scrollToBottom());
		});
		return () => cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		if (feed.length === 0) return;
		const frame = requestAnimationFrame(() => scrollToBottom());
		return () => cancelAnimationFrame(frame);
	}, [feed.length, conversation]);

	if (feed.length === 0)
		return (
			<div
				className={cn(
					"flex flex-1 flex-col items-center justify-center px-6 pb-56 text-center",
					className
				)}
			>
				<div className="max-w-sm space-y-1.5">
					<p className="font-medium text-sm">No conversation yet</p>
					<p className="text-muted-foreground text-xs">
						Ask the agent to inspect the repo, run a command, or continue the
						active thread.
					</p>
				</div>
			</div>
		);

	return (
		<div
			className={cn("flex min-h-0 flex-1 flex-col", className)}
			ref={rootRef}
		>
			<ScrollArea className="flex-1">
				<div className="mx-auto flex max-w-3xl flex-col px-4 pt-4 pb-56">
					{feed.map((entry) => (
						<FeedEntryView entry={entry} key={entry.id} />
					))}
				</div>
			</ScrollArea>
		</div>
	);
}
