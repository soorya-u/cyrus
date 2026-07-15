import type { FeedEntry } from "@cyrus/utils/conversations/thread-feed";
import { ErrorRow } from "@/components/chat/feed/error-row";
import { AssistantMessage } from "@/components/chat/messages/assistant-message";
import { AssistantThinking } from "@/components/chat/messages/assistant-thinking";
import { UserMessage } from "@/components/chat/messages/user-message";
import { DiffRow } from "@/components/chat/work-log/diff-row";
import { ToolRow } from "@/components/chat/work-log/tool-row";

export function FeedEntryView({ entry }: { entry: FeedEntry }) {
	switch (entry.type) {
		case "thought":
			return <AssistantThinking thought={entry.thought} />;
		case "message":
			return entry.message.role === "user" ? (
				<UserMessage message={entry.message} />
			) : (
				<AssistantMessage message={entry.message} />
			);
		case "tool":
			return <ToolRow tool={entry.tool} />;
		case "diff":
			return <DiffRow diff={entry.diff} />;
		case "error":
			return <ErrorRow error={entry.error} />;
		default: {
			const _exhaustive: never = entry;
			return _exhaustive;
		}
	}
}
