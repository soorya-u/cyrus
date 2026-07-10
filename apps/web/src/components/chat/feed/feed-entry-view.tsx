import type { FeedEntry } from "@cyrus/hooks/use-thread-feed";
import { AssistantLoading } from "@/components/chat/messages/assistant-loading";
import { AssistantMessage } from "@/components/chat/messages/assistant-message";
import { AssistantThinking } from "@/components/chat/messages/assistant-thinking";
import { UserMessage } from "@/components/chat/messages/user-message";
import {
	WorkLog,
	type WorkLogEntry,
} from "@/components/chat/work-log/work-log";

export function FeedEntryView({ entry }: { entry: FeedEntry }) {
	if (entry.type === "loading") return <AssistantLoading />;
	if (entry.type === "thought" && entry.thought)
		return <AssistantThinking thought={entry.thought} />;
	if (entry.type === "message" && entry.message)
		return entry.message.role === "user" ? (
			<UserMessage message={entry.message} />
		) : (
			<AssistantMessage message={entry.message} />
		);

	if (entry.type === "work") return <WorkLog entry={entry as WorkLogEntry} />;

	return null;
}
