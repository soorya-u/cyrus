import type { ThreadConversation } from "@cyrus/schemas/view";
import {
	deriveFeed,
	getRunningTurn,
	getTurnStartedAt,
} from "@cyrus/utils/conversations/thread-feed";
import { cn } from "cnfast";
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
	activeTurnId,
	className,
}: {
	conversation: ThreadConversation;
	activeTurnId?: string;
	className?: string;
}) {
	const feed = deriveFeed(conversation, activeTurnId);
	const runningTurn = getRunningTurn(conversation);
	const workingStartedAt =
		runningTurn && getTurnStartedAt(conversation, runningTurn.id);

	if (feed.length === 0 && !runningTurn) {
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
							{runningTurn && workingStartedAt && (
								<MessageScrollerItem messageId={`working-${runningTurn.id}`}>
									<WorkingMarker startedAt={workingStartedAt} />
								</MessageScrollerItem>
							)}
						</MessageScrollerContent>
					</MessageScrollerViewport>
					<MessageScrollerButton direction="end" />
				</MessageScroller>
			</MessageScrollerProvider>
		</div>
	);
}
