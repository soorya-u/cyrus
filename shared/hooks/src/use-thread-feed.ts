import type {
	DiffView,
	MessageView,
	ThreadConversation,
	ToolCallView,
} from "@cyrus/schemas/view";

export type FeedEntry = {
	activities?: ToolCallView[];
	diffs?: DiffView[];
	expanded?: boolean;
	id: string;
	label?: string;
	message?: MessageView;
	turnId?: string;
	type: "message" | "work" | "turn-fold";
};

export function deriveFeed(
	conversation: ThreadConversation | null
): FeedEntry[] {
	if (!conversation) return [];

	const entries: FeedEntry[] = [];
	const activitiesByTurn = new Map<
		string,
		{ tools: ToolCallView[]; diffs: DiffView[] }
	>();
	for (const tc of conversation.toolCalls) {
		const group = activitiesByTurn.get(tc.turnId) ?? { tools: [], diffs: [] };
		group.tools.push(tc);
		activitiesByTurn.set(tc.turnId, group);
	}
	for (const d of conversation.diffs) {
		const group = activitiesByTurn.get(d.turnId) ?? { tools: [], diffs: [] };
		group.diffs.push(d);
		activitiesByTurn.set(d.turnId, group);
	}

	const seenTurns = new Set<string>();
	for (const msg of conversation.messages) {
		if (!msg.turnId) {
			entries.push({ type: "message", id: msg.id, message: msg });
			continue;
		}
		const group = activitiesByTurn.get(msg.turnId);
		if (
			!seenTurns.has(msg.turnId) &&
			group &&
			(group.tools.length > 0 || group.diffs.length > 0)
		) {
			entries.push({
				type: "work",
				id: `work-${msg.turnId}`,
				turnId: msg.turnId,
				activities: group.tools,
				diffs: group.diffs,
			});
			seenTurns.add(msg.turnId);
		}
		entries.push({ type: "message", id: msg.id, message: msg });
	}
	return entries;
}

export function useThreadFeed(
	conversation: ThreadConversation | null
): FeedEntry[] {
	return deriveFeed(conversation);
}
