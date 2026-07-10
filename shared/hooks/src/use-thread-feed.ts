import type {
	DiffView,
	MessageView,
	ThoughtView,
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
	thought?: ThoughtView;
	turnId?: string;
	type: "message" | "work" | "turn-fold" | "loading" | "thought";
};

type TimelineItem = {
	createdAt: string;
	kind: number;
	entry: FeedEntry;
};

function messageSortKind(message: MessageView): number {
	if (message.role === "user") return 0;
	return 2;
}

function buildTurnTimeline(
	turnId: string,
	messages: MessageView[],
	thoughts: ThoughtView[],
	toolCalls: ToolCallView[],
	diffs: DiffView[]
): FeedEntry[] {
	const timeline: TimelineItem[] = [];

	for (const message of messages) {
		if (message.turnId !== turnId) continue;
		timeline.push({
			createdAt: message.createdAt,
			kind: messageSortKind(message),
			entry: { type: "message", id: message.id, message },
		});
	}

	for (const thought of thoughts) {
		if (thought.turnId !== turnId) continue;
		timeline.push({
			createdAt: thought.createdAt,
			kind: 1,
			entry: { type: "thought", id: thought.id, thought },
		});
	}

	const diffsClaimed = new Set<string>();

	for (const toolCall of toolCalls) {
		if (toolCall.turnId !== turnId) continue;
		const turnDiffs = diffs.filter(
			(diff) => diff.turnId === turnId && !diffsClaimed.has(diff.id)
		);
		for (const diff of turnDiffs) diffsClaimed.add(diff.id);

		timeline.push({
			createdAt: toolCall.createdAt,
			kind: 3,
			entry: {
				type: "work",
				id: `work-${toolCall.toolCallId}`,
				turnId,
				activities: [toolCall],
				diffs: turnDiffs,
			},
		});
	}

	timeline.sort((left, right) => {
		const leftIsUser = left.kind === 0;
		const rightIsUser = right.kind === 0;
		if (leftIsUser && !rightIsUser) return -1;
		if (!leftIsUser && rightIsUser) return 1;

		const byTime = left.createdAt.localeCompare(right.createdAt);
		if (byTime !== 0) return byTime;
		return left.kind - right.kind;
	});

	return timeline.map((item) => item.entry);
}

export function deriveFeed(
	conversation: ThreadConversation | null,
	activeTurnId?: string
): FeedEntry[] {
	if (!conversation) return [];

	const entries: FeedEntry[] = [];
	const knownTurnIds = new Set(conversation.turns.map((turn) => turn.id));
	const runningTurn = conversation.turns.find(
		(turn) => turn.state === "running"
	);
	const loadingTurnId = runningTurn?.id ?? activeTurnId;

	for (const turn of conversation.turns) {
		entries.push(
			...buildTurnTimeline(
				turn.id,
				conversation.messages,
				conversation.thoughts,
				conversation.toolCalls,
				conversation.diffs
			)
		);

		if (turn.id !== loadingTurnId) continue;

		const assistant = conversation.messages.find(
			(msg) => msg.role === "assistant" && msg.turnId === turn.id
		);
		const thought = conversation.thoughts.find(
			(item) => item.turnId === turn.id
		);
		if (!(assistant?.content.trim() || thought?.content.trim())) {
			entries.push({
				type: "loading",
				id: `loading-${turn.id}`,
				turnId: turn.id,
			});
		}
	}

	for (const message of conversation.messages) {
		if (!message.turnId || knownTurnIds.has(message.turnId)) continue;
		entries.push({ type: "message", id: message.id, message });
	}

	if (
		activeTurnId &&
		!knownTurnIds.has(activeTurnId) &&
		loadingTurnId === activeTurnId
	) {
		entries.push({
			type: "loading",
			id: `loading-${activeTurnId}`,
			turnId: activeTurnId,
		});
	}

	return entries;
}

export function useThreadFeed(
	conversation: ThreadConversation | null,
	activeTurnId?: string
): FeedEntry[] {
	return deriveFeed(conversation, activeTurnId);
}
