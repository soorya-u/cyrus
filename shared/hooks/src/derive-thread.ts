import type {
	AgentEvent,
	ToolCallContent,
} from "@cyrus/connections/schemas/rtc/chat";
import type { ConversationEntry } from "@cyrus/connections/schemas/rtc/threads";
import type { GitDiff, Message, ToolCall, Turn } from "./types";

type ConversationDerived = {
	messages: Message[];
	toolCalls: ToolCall[];
	diffs: GitDiff[];
	turns: Turn[];
};

function asArgs(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function asResult(value: unknown): string | undefined {
	if (value === undefined) return;
	return typeof value === "string" ? value : JSON.stringify(value);
}

function touchTurn(
	turns: Map<string, Turn>,
	turnId: string,
	threadId: string,
	createdAt: string
): void {
	const existing = turns.get(turnId);
	if (existing) {
		existing.completedAt = createdAt;
		return;
	}
	turns.set(turnId, {
		completedAt: createdAt,
		id: turnId,
		index: turns.size,
		state: "complete",
		threadId,
	});
}

function upsertDiffs(
	diffs: Map<string, GitDiff>,
	content: ToolCallContent[] | null | undefined,
	turnId: string
): void {
	if (!content) return;
	for (const item of content) {
		if (item.type !== "diff") continue;
		diffs.set(`${turnId}:${item.path}`, {
			additions: item.additions,
			deletions: item.deletions,
			id: `${turnId}:${item.path}`,
			patch: item.patch,
			path: item.path,
			turnId,
		});
	}
}

type MutableState = {
	messages: Map<string, Message>;
	toolCalls: Map<string, ToolCall>;
	diffs: Map<string, GitDiff>;
};

function applyUserMessage(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "user_message" }>,
	turnId: string
): void {
	state.messages.set(entry.id, {
		content: event.content,
		createdAt: entry.createdAt,
		id: entry.id,
		role: "user",
		turnId,
	});
}

function applyToken(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "token" }>,
	turnId: string
): void {
	const key = event.messageId ?? turnId;
	const existing = state.messages.get(key);
	if (existing) {
		existing.content += event.text;
		return;
	}
	state.messages.set(key, {
		content: event.text,
		createdAt: entry.createdAt,
		id: key,
		role: "assistant",
		turnId,
	});
}

function applyToolCall(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "tool_call" }>,
	turnId: string
): void {
	state.toolCalls.set(event.toolCallId, {
		args: asArgs(event.rawInput),
		createdAt: entry.createdAt,
		id: event.toolCallId,
		kind: event.kind,
		name: event.title,
		result: asResult(event.rawOutput),
		status: event.status ?? "pending",
		turnId,
	});
	upsertDiffs(state.diffs, event.content, turnId);
}

function applyToolCallUpdate(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "tool_call_update" }>,
	turnId: string
): void {
	const existing = state.toolCalls.get(event.toolCallId);
	if (existing) {
		if (event.title) existing.name = event.title;
		if (event.status) existing.status = event.status;
		if (event.rawOutput !== undefined)
			existing.result = asResult(event.rawOutput);
	} else {
		state.toolCalls.set(event.toolCallId, {
			args: {},
			createdAt: entry.createdAt,
			id: event.toolCallId,
			name: event.title ?? event.toolCallId,
			result: asResult(event.rawOutput),
			status: event.status ?? "pending",
			turnId,
		});
	}
	upsertDiffs(state.diffs, event.content, turnId);
}

function applyEvent(state: MutableState, entry: ConversationEntry): void {
	const { turnId, event } = entry.chunk;
	switch (event.type) {
		case "user_message":
			applyUserMessage(state, entry, event, turnId);
			return;
		case "token":
			applyToken(state, entry, event, turnId);
			return;
		case "tool_call":
			applyToolCall(state, entry, event, turnId);
			return;
		case "tool_call_update":
			applyToolCallUpdate(state, entry, event, turnId);
			return;
		default:
			return;
	}
}

/**
 * Folds a thread's raw ConversationEntry log (the CLI's source of truth) into
 * the aggregated shape the UI renders. Mirrors how use-thread-feed.ts folds a
 * Thread into FeedEntry[] — this is the layer below it, building the Thread
 * fields in the first place.
 *
 * Known limitation: the wire protocol has no turn-completion marker, so a
 * turn's `state` can only be inferred (latest turn = "running", everything
 * earlier = "complete") rather than asserted. Good enough until a
 * turn_completed event exists.
 */
export function deriveThreadFromConversation(
	entries: ConversationEntry[]
): ConversationDerived {
	const state: MutableState = {
		diffs: new Map(),
		messages: new Map(),
		toolCalls: new Map(),
	};
	const turns = new Map<string, Turn>();

	for (const entry of entries) {
		touchTurn(turns, entry.chunk.turnId, entry.threadId, entry.createdAt);
		applyEvent(state, entry);
	}

	const orderedTurns = [...turns.values()];
	const latestTurn = orderedTurns.at(-1);
	if (latestTurn) latestTurn.state = "running";

	return {
		diffs: [...state.diffs.values()],
		messages: [...state.messages.values()].map((message) => ({
			...message,
			streaming:
				message.role === "assistant" && message.turnId === latestTurn?.id,
		})),
		toolCalls: [...state.toolCalls.values()],
		turns: orderedTurns,
	};
}
