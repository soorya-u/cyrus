import type {
	ApprovalView,
	DiffView,
	ElicitationView,
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
	pendingApproval?: ApprovalView;
};

export type DiffFeedEntry = FeedEntryBase & {
	type: "diff";
	diff: DiffView;
	turnId: string;
	pendingApproval?: ApprovalView;
};

export type ErrorFeedEntry = FeedEntryBase & {
	type: "error";
	error: ErrorView;
	turnId: string;
};

export type ApprovalFeedEntry = FeedEntryBase & {
	type: "approval";
	approval: ApprovalView;
	turnId: string;
};

export type ElicitationFeedEntry = FeedEntryBase & {
	type: "elicitation";
	elicitation: ElicitationView;
	turnId: string;
};

export type FeedEntry =
	| MessageFeedEntry
	| ThoughtFeedEntry
	| ToolFeedEntry
	| DiffFeedEntry
	| ErrorFeedEntry
	| ApprovalFeedEntry
	| ElicitationFeedEntry;

type TimelineItem = {
	createdAt: string;
	kind: number;
	entry: FeedEntry;
};

function messageSortKind(message: MessageView): number {
	if (message.role === "user") return 0;
	return 2;
}

function findPendingApproval(
	approvals: ApprovalView[],
	toolCallId: string | undefined
): ApprovalView | undefined {
	if (!toolCallId) return;
	return approvals.find(
		(approval) => approval.toolCallId === toolCallId && !approval.resolved
	);
}

function pushTurnItems<T extends { turnId: string }>(
	items: T[],
	turnId: string,
	push: (item: T) => void
): void {
	for (const item of items) {
		if (item.turnId !== turnId) continue;
		push(item);
	}
}

function buildTurnTimeline(
	turnId: string,
	messages: MessageView[],
	thoughts: ThoughtView[],
	toolCalls: ToolCallView[],
	diffs: DiffView[],
	errors: ErrorView[],
	approvals: ApprovalView[],
	elicitations: ElicitationView[]
): FeedEntry[] {
	const timeline: TimelineItem[] = [];

	pushTurnItems(messages, turnId, (message) => {
		timeline.push({
			createdAt: message.createdAt,
			kind: messageSortKind(message),
			entry: { type: "message", id: message.id, message },
		});
	});

	pushTurnItems(thoughts, turnId, (thought) => {
		timeline.push({
			createdAt: thought.createdAt,
			kind: 1,
			entry: { type: "thought", id: thought.id, thought },
		});
	});

	pushTurnItems(toolCalls, turnId, (toolCall) => {
		timeline.push({
			createdAt: toolCall.createdAt,
			kind: 3,
			entry: {
				type: "tool",
				id: `tool-${toolCall.toolCallId}`,
				tool: toolCall,
				turnId,
				pendingApproval: findPendingApproval(approvals, toolCall.toolCallId),
			},
		});
	});

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

	pushTurnItems(diffs, turnId, (diff) => {
		timeline.push({
			createdAt: diffSortAnchor,
			kind: 4,
			entry: {
				type: "diff",
				id: diff.id,
				diff,
				turnId,
				pendingApproval: findPendingApproval(approvals, diff.toolCallId),
			},
		});
	});

	pushTurnItems(approvals, turnId, (approval) => {
		timeline.push({
			createdAt: approval.createdAt,
			kind: 4.5,
			entry: {
				type: "approval",
				id: approval.id,
				approval,
				turnId,
			},
		});
	});

	pushTurnItems(elicitations, turnId, (elicitation) => {
		timeline.push({
			createdAt: elicitation.createdAt,
			kind: 4.6,
			entry: {
				type: "elicitation",
				id: elicitation.id,
				elicitation,
				turnId,
			},
		});
	});

	pushTurnItems(errors, turnId, (error) => {
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
	});

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
	const approvals = conversation.approvals ?? [];
	const elicitations = conversation.elicitations ?? [];

	for (const turn of conversation.turns) {
		entries.push(
			...buildTurnTimeline(
				turn.id,
				conversation.messages,
				conversation.thoughts,
				conversation.toolCalls,
				conversation.diffs,
				conversation.errors,
				approvals,
				elicitations
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
		case "approval":
			return entry.approval.createdAt;
		case "elicitation":
			return entry.elicitation.createdAt;
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
