import type {
	ApprovalView,
	ElicitationView,
	ErrorView,
	MessageView,
	ThoughtView,
	ThreadConversation,
	ToolCallView,
} from "@cyrus/schemas/view";
import { compareOrderKey, type OrderKey, orderKey } from "./order-key";

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
	| ErrorFeedEntry
	| ApprovalFeedEntry
	| ElicitationFeedEntry;

type TimelineItem = {
	order: OrderKey;
	entry: FeedEntry;
};

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
	errors: ErrorView[],
	approvals: ApprovalView[],
	elicitations: ElicitationView[]
): FeedEntry[] {
	const timeline: TimelineItem[] = [];

	pushTurnItems(messages, turnId, (message) => {
		timeline.push({
			order: orderKey(message),
			entry: { type: "message", id: message.id, message },
		});
	});

	pushTurnItems(thoughts, turnId, (thought) => {
		timeline.push({
			order: orderKey(thought),
			entry: { type: "thought", id: thought.id, thought },
		});
	});

	pushTurnItems(toolCalls, turnId, (toolCall) => {
		timeline.push({
			order: orderKey(toolCall),
			entry: {
				type: "tool",
				id: `tool-${toolCall.toolCallId}`,
				tool: toolCall,
				turnId,
				pendingApproval: findPendingApproval(approvals, toolCall.toolCallId),
			},
		});
	});

	pushTurnItems(approvals, turnId, (approval) => {
		timeline.push({
			order: orderKey(approval),
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
			order: orderKey(elicitation),
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
			order: orderKey(error),
			entry: {
				type: "error",
				id: error.id,
				error,
				turnId,
			},
		});
	});

	timeline.sort((left, right) => compareOrderKey(left.order, right.order));

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
		insertFeedEntryByOrderKey(entries, orderKey(error), {
			type: "error",
			id: error.id,
			error,
			turnId: error.turnId,
		});
	}

	return entries;
}

function feedEntryOrderKey(entry: FeedEntry): OrderKey {
	switch (entry.type) {
		case "message":
			return orderKey(entry.message);
		case "thought":
			return orderKey(entry.thought);
		case "tool":
			return orderKey(entry.tool);
		case "error":
			return orderKey(entry.error);
		case "approval":
			return orderKey(entry.approval);
		case "elicitation":
			return orderKey(entry.elicitation);
		default: {
			const _exhaustive: never = entry;
			return _exhaustive;
		}
	}
}

function insertFeedEntryByOrderKey(
	entries: FeedEntry[],
	target: OrderKey,
	entry: ErrorFeedEntry
): void {
	let index = 0;
	for (const existing of entries) {
		if (compareOrderKey(feedEntryOrderKey(existing), target) > 0) break;
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
	].sort((left, right) => compareOrderKey(orderKey(left), orderKey(right)))[0];

	return firstActivity?.createdAt ?? null;
}
