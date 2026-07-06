import type { FeedEntry } from "@cyrus/hooks/types";
import { AssistantMessage } from "@/components/chat/messages/assistant-message";
import { UserMessage } from "@/components/chat/messages/user-message";
import {
	WorkLog,
	type WorkLogEntry,
} from "@/components/chat/work-log/work-log";

export function FeedEntryView({ entry }: { entry: FeedEntry }) {
	if (entry.type === "message" && entry.message) {
		return entry.message.role === "user" ? (
			<UserMessage message={entry.message} />
		) : (
			<AssistantMessage message={entry.message} />
		);
	}
	if (entry.type === "work") {
		return <WorkLog entry={entry as WorkLogEntry} />;
	}
	return null;
}
