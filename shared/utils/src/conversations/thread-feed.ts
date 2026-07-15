import type {
	DiffView,
	ErrorView,
	MessageView,
	ThoughtView,
	ThreadConversation,
	ToolCallView,
} from "@cyrus/schemas/view";

type FeedEntryBase = {
	id: string;
};

export type MessageFeedEntry = FeedEntryBase & {
	type: "message";
	message: MessageView;
};

export type ThoughtFeedEntry = FeedEntryBase & {
	type: "thought";
	thought: ThoughtView;
};

export type ToolFeedEntry = FeedEntryBase & {
	type: "tool";
	tool: ToolCallView;
	turnId: string;
};

export type DiffFeedEntry = FeedEntryBase & {
	type: "diff";
	diff: DiffView;
	turnId: string;
};

export type ErrorFeedEntry = FeedEntryBase & {
	type: "error";
	error: ErrorView;
	turnId: string;
};

export type FeedEntry =
	| MessageFeedEntry
	| ThoughtFeedEntry
	| ToolFeedEntry
	| DiffFeedEntry
	| ErrorFeedEntry;

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
	diffs: DiffView[],
	errors: ErrorView[]
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

	for (const toolCall of toolCalls) {
		if (toolCall.turnId !== turnId) continue;
		timeline.push({
			createdAt: toolCall.createdAt,
			kind: 3,
			entry: {
				type: "tool",
				id: `tool-${toolCall.toolCallId}`,
				tool: toolCall,
				turnId,
			},
		});
	}

	const diffSortAnchor =
		toolCalls
			.filter((toolCall) => toolCall.turnId === turnId)
			.reduce<string | undefined>(
				(latest, toolCall) =>
					!latest || toolCall.createdAt > latest ? toolCall.createdAt : latest,
				undefined
			) ??
		messages.find(
			(message) => message.role === "user" && message.turnId === turnId
		)?.createdAt ??
		turnId;

	for (const diff of diffs) {
		if (diff.turnId !== turnId) continue;
		timeline.push({
			createdAt: diffSortAnchor,
			kind: 4,
			entry: {
				type: "diff",
				id: diff.id,
				diff,
				turnId,
			},
		});
	}

	for (const error of errors) {
		if (error.turnId !== turnId) continue;
		timeline.push({
			createdAt: error.createdAt,
			kind: 5,
			entry: {
				type: "error",
				id: error.id,
				error,
				turnId,
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
	conversation: ThreadConversation | null
): FeedEntry[] {
	if (!conversation) return [];

	const entries: FeedEntry[] = [];
	const knownTurnIds = new Set(conversation.turns.map((turn) => turn.id));

	for (const turn of conversation.turns) {
		entries.push(
			...buildTurnTimeline(
				turn.id,
				conversation.messages,
				conversation.thoughts,
				conversation.toolCalls,
				conversation.diffs,
				conversation.errors
			)
		);
	}

	for (const message of conversation.messages) {
		if (!message.turnId || knownTurnIds.has(message.turnId)) continue;
		entries.push({ type: "message", id: message.id, message });
	}

	const orphanedErrors = conversation.errors.filter(
		(error) => !knownTurnIds.has(error.turnId)
	);
	for (const error of orphanedErrors) {
		insertFeedEntryByCreatedAt(entries, {
			type: "error",
			id: error.id,
			error,
			turnId: error.turnId,
		});
	}

	return entries;
}

function feedEntryCreatedAt(entry: FeedEntry): string | null {
	switch (entry.type) {
		case "message":
			return entry.message.createdAt;
		case "thought":
			return entry.thought.createdAt;
		case "tool":
			return entry.tool.createdAt;
		case "diff":
			return null;
		case "error":
			return entry.error.createdAt;
		default: {
			const _exhaustive: never = entry;
			return _exhaustive;
		}
	}
}

function insertFeedEntryByCreatedAt(
	entries: FeedEntry[],
	entry: ErrorFeedEntry
): void {
	const createdAt = entry.error.createdAt;
	let index = 0;
	for (const existing of entries) {
		const existingAt = feedEntryCreatedAt(existing);
		if (existingAt !== null && existingAt > createdAt) break;
		index += 1;
	}
	entries.splice(index, 0, entry);
}

export function getRunningTurn(
	conversation: ThreadConversation | null
): ThreadConversation["turns"][number] | null {
	if (!conversation) return null;
	return conversation.turns.find((turn) => turn.state === "running") ?? null;
}

export function getTurnStartedAt(
	conversation: ThreadConversation,
	turnId: string
): string | null {
	const userMessage = conversation.messages.find(
		(message) => message.role === "user" && message.turnId === turnId
	);
	if (userMessage) return userMessage.createdAt;

	const firstActivity = [
		...conversation.thoughts.filter((thought) => thought.turnId === turnId),
		...conversation.toolCalls.filter((tool) => tool.turnId === turnId),
		...conversation.messages.filter(
			(message) => message.role === "assistant" && message.turnId === turnId
		),
	].sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];

	return firstActivity?.createdAt ?? null;
}
