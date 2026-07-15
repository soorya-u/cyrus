import type { ThreadConversation } from "@cyrus/schemas/view";
import {
	deriveFeed,
	getRunningTurn,
	getTurnStartedAt,
} from "@cyrus/utils/conversations/thread-feed";
import { cn } from "cnfast";
import { useEffect, useMemo, useState } from "react";
import { FeedEntryView } from "@/components/chat/feed/feed-entry-view";
import { WorkingMarker } from "@/components/chat/messages/working-marker";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@/components/ui/message-scroller";

export function ChatFeed({
	conversation,
	active = false,
	className,
}: {
	conversation: ThreadConversation;
	/** True while a turn is in flight even before fold marks it running. */
	active?: boolean;
	className?: string;
}) {
	const feed = useMemo(() => deriveFeed(conversation), [conversation]);
	const runningTurn = useMemo(
		() => getRunningTurn(conversation),
		[conversation]
	);
	const foldedStartedAt =
		(runningTurn && getTurnStartedAt(conversation, runningTurn.id)) ||
		runningTurn?.completedAt ||
		null;

	const [activeStartedAt, setActiveStartedAt] = useState<string | null>(null);
	useEffect(() => {
		if (foldedStartedAt) {
			setActiveStartedAt(foldedStartedAt);
			return;
		}
		if (active) {
			setActiveStartedAt((prev) => prev ?? new Date().toISOString());
			return;
		}
		setActiveStartedAt(null);
	}, [active, foldedStartedAt]);

	const showWorking = Boolean(runningTurn || active);
	const startedAt = foldedStartedAt ?? activeStartedAt;

	if (feed.length === 0 && !showWorking) {
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
		<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
			<MessageScrollerProvider>
				<MessageScroller className="flex-1">
					<MessageScrollerViewport>
						<MessageScrollerContent className="mx-auto max-w-3xl gap-4 px-4 pt-4 pb-56">
							{feed.map((entry) => (
								<MessageScrollerItem key={entry.id} messageId={entry.id}>
									<FeedEntryView entry={entry} />
								</MessageScrollerItem>
							))}
							{showWorking && startedAt ? (
								<MessageScrollerItem
									messageId={`working-${runningTurn?.id ?? "active"}`}
								>
									<WorkingMarker startedAt={startedAt} />
								</MessageScrollerItem>
							) : null}
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton direction="end" />
				</MessageScroller>
			</MessageScrollerProvider>
		</div>
	);
}
