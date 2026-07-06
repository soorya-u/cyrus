import type { Thread } from "@cyrus/hooks/types";
import { useThreadFeed } from "@cyrus/hooks/use-thread-feed";
import { cn } from "cnfast";
import { useEffect, useRef } from "react";
import { FeedEntryView } from "@/components/chat/feed/feed-entry-view";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatFeed({
	thread,
	className,
}: {
	thread: Thread;
	className?: string;
}) {
	const feed = useThreadFeed(thread);
	const endRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, []);

	if (feed.length === 0) {
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
	}
	return (
		<ScrollArea className={cn("flex-1", className)}>
			<div className="mx-auto flex max-w-3xl flex-col px-4 pt-4 pb-56">
				{feed.map((entry) => (
					<FeedEntryView entry={entry} key={entry.id} />
				))}
				<div ref={endRef} />
			</div>
		</ScrollArea>
	);
}
