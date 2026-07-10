import type { AgentEvent, ToolCallContent } from "@cyrus/schemas/rtc/chat";
import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";
import {
	type DiffView,
	type MessageView,
	type ThoughtView,
	type ThreadConversation,
	ThreadConversationSchema,
	type ToolCallView,
	type TurnView,
} from "@cyrus/schemas/view";
import { Result } from "better-result";
import type { ZodError } from "zod";

type MutableState = {
	messages: Map<string, MessageView>;
	thoughts: Map<string, ThoughtView>;
	toolCalls: Map<string, ToolCallView>;
	diffs: Map<string, DiffView>;
};

function touchTurn(
	turns: Map<string, TurnView>,
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
	diffs: Map<string, DiffView>,
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

function applyUserMessage(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "user_message" }>,
	turnId: string
): void {
	const key = `user-${turnId}`;
	const existing = state.messages.get(key);
	if (existing) {
		existing.content = event.content;
		if (entry.createdAt < existing.createdAt) {
			existing.createdAt = entry.createdAt;
		}
		return;
	}
	state.messages.set(key, {
		content: event.content,
		createdAt: entry.createdAt,
		id: key,
		role: "user",
		turnId,
	});
}

function assistantMessageKey(
	turnId: string,
	messageId?: string | null
): string {
	return messageId ? `${turnId}:${messageId}` : turnId;
}

function thoughtKey(turnId: string, messageId?: string | null): string {
	return messageId ? `${turnId}:thought:${messageId}` : `${turnId}:thought`;
}

function applyThought(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "thought" }>,
	turnId: string
): void {
	if (!event.text) return;

	const key = thoughtKey(turnId, event.messageId);
	const existing = state.thoughts.get(key);
	if (existing) {
		existing.content += event.text;
		return;
	}
	state.thoughts.set(key, {
		content: event.text,
		createdAt: entry.createdAt,
		id: key,
		turnId,
	});
}

function applyReasoningCompleted(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "reasoning_completed" }>,
	turnId: string,
	completedThoughtIds: Set<string>
): void {
	const key = thoughtKey(turnId, event.messageId);
	completedThoughtIds.add(key);
	const existing = state.thoughts.get(key);
	if (existing) {
		existing.content = event.text;
		return;
	}
	state.thoughts.set(key, {
		content: event.text,
		createdAt: entry.createdAt,
		id: key,
		turnId,
	});
}

function applyToken(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "token" }>,
	turnId: string
): void {
	if (!event.text) return;

	const key = assistantMessageKey(turnId, event.messageId);
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
		createdAt: entry.createdAt,
		kind: event.kind,
		rawInput: event.rawInput,
		rawOutput: event.rawOutput,
		status: event.status ?? "pending",
		title: event.title,
		toolCallId: event.toolCallId,
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
		if (event.title) existing.title = event.title;
		if (event.status) existing.status = event.status;
		if (event.kind) existing.kind = event.kind;
		if (event.rawInput !== undefined) existing.rawInput = event.rawInput;
		if (event.rawOutput !== undefined) existing.rawOutput = event.rawOutput;
	} else {
		state.toolCalls.set(event.toolCallId, {
			createdAt: entry.createdAt,
			kind: event.kind ?? undefined,
			rawInput: event.rawInput,
			rawOutput: event.rawOutput,
			status: event.status ?? "pending",
			title: event.title ?? event.toolCallId,
			toolCallId: event.toolCallId,
			turnId,
		});
	}
	upsertDiffs(state.diffs, event.content, turnId);
}

function applyMessageCompleted(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "message_completed" }>,
	turnId: string
): void {
	const key = assistantMessageKey(turnId, event.messageId);
	const existing = state.messages.get(key);
	if (existing) {
		existing.content = event.text;
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

function inferTurnState(
	turnEntries: ConversationEntry[],
	isLatest: boolean
): TurnView["state"] {
	const events = turnEntries.map((entry) => entry.chunk.event);

	if (events.some((event) => event.type === "turn_interrupted")) {
		return "interrupted";
	}
	if (events.some((event) => event.type === "turn_completed")) {
		return "complete";
	}
	if (!isLatest) return "complete";

	const hasUserMessage = events.some((event) => event.type === "user_message");
	if (hasUserMessage) return "running";

	return "complete";
}

function latestTurnIdFromEntries(
	entries: ConversationEntry[]
): string | undefined {
	let latestTurnId: string | undefined;
	let latestCreatedAt = "";

	for (const entry of entries) {
		if (entry.chunk.event.type !== "user_message") continue;
		if (entry.createdAt >= latestCreatedAt) {
			latestCreatedAt = entry.createdAt;
			latestTurnId = entry.chunk.turnId;
		}
	}

	return latestTurnId;
}

function turnStartedAt(entries: ConversationEntry[], turnId: string): string {
	const userMessages = entries.filter(
		(entry) =>
			entry.chunk.turnId === turnId && entry.chunk.event.type === "user_message"
	);
	if (userMessages.length > 0) {
		return userMessages.reduce(
			(earliest, entry) =>
				entry.createdAt < earliest ? entry.createdAt : earliest,
			userMessages[0]?.createdAt ?? "\uffff"
		);
	}

	const turnEntries = entries.filter((entry) => entry.chunk.turnId === turnId);
	return turnEntries[0]?.createdAt ?? "\uffff";
}

function turnMinPersistedSeq(
	entries: ConversationEntry[],
	turnId: string
): number {
	const seqs = entries
		.filter((entry) => entry.chunk.turnId === turnId && entry.seq > 0)
		.map((entry) => entry.seq);
	if (seqs.length === 0) return Number.POSITIVE_INFINITY;
	return Math.min(...seqs);
}

function compareTurnOrder(
	entries: ConversationEntry[],
	leftId: string,
	rightId: string
): number {
	const leftSeq = turnMinPersistedSeq(entries, leftId);
	const rightSeq = turnMinPersistedSeq(entries, rightId);
	if (leftSeq !== rightSeq) return leftSeq - rightSeq;
	return turnStartedAt(entries, leftId).localeCompare(
		turnStartedAt(entries, rightId)
	);
}

function applyEvent(
	state: MutableState,
	entry: ConversationEntry,
	completedThoughtIds: Set<string>
): void {
	const { turnId, event } = entry.chunk;
	switch (event.type) {
		case "user_message":
			applyUserMessage(state, entry, event, turnId);
			return;
		case "thought":
			applyThought(state, entry, event, turnId);
			return;
		case "reasoning_completed":
			applyReasoningCompleted(state, entry, event, turnId, completedThoughtIds);
			return;
		case "token":
			applyToken(state, entry, event, turnId);
			return;
		case "message_completed":
			applyMessageCompleted(state, entry, event, turnId);
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

export function fold(
	entries: ConversationEntry[]
): Result<ThreadConversation, ZodError> {
	const state: MutableState = {
		diffs: new Map(),
		messages: new Map(),
		thoughts: new Map(),
		toolCalls: new Map(),
	};
	const completedThoughtIds = new Set<string>();
	const turns = new Map<string, TurnView>();
	const entriesByTurn = new Map<string, ConversationEntry[]>();

	for (const entry of entries) {
		touchTurn(turns, entry.chunk.turnId, entry.threadId, entry.createdAt);
		applyEvent(state, entry, completedThoughtIds);

		const turnEntries = entriesByTurn.get(entry.chunk.turnId) ?? [];
		turnEntries.push(entry);
		entriesByTurn.set(entry.chunk.turnId, turnEntries);
	}

	const orderedTurns = [...turns.values()].sort((left, right) =>
		compareTurnOrder(entries, left.id, right.id)
	);
	orderedTurns.forEach((turn, index) => {
		turn.index = index;
	});
	const latestTurnId = latestTurnIdFromEntries(entries);

	for (const turn of orderedTurns) {
		const turnEntries = entriesByTurn.get(turn.id) ?? [];
		turn.state = inferTurnState(turnEntries, turn.id === latestTurnId);
	}

	const latestTurn = latestTurnId
		? orderedTurns.find((turn) => turn.id === latestTurnId)
		: orderedTurns.at(-1);

	const turnOrder = new Map(
		orderedTurns.map((turn, index) => [turn.id, index] as const)
	);

	const parsed = ThreadConversationSchema.safeParse({
		diffs: [...state.diffs.values()],
		thoughts: [...state.thoughts.values()]
			.filter((thought) => thought.content.trim().length > 0)
			.sort((left, right) => {
				const leftTurn = left.turnId
					? (turnOrder.get(left.turnId) ?? Number.MAX_SAFE_INTEGER)
					: Number.MAX_SAFE_INTEGER;
				const rightTurn = right.turnId
					? (turnOrder.get(right.turnId) ?? Number.MAX_SAFE_INTEGER)
					: Number.MAX_SAFE_INTEGER;
				if (leftTurn !== rightTurn) return leftTurn - rightTurn;
				return left.createdAt.localeCompare(right.createdAt);
			})
			.map((thought) => ({
				...thought,
				streaming:
					thought.turnId === latestTurn?.id &&
					latestTurn?.state === "running" &&
					!completedThoughtIds.has(thought.id),
			})),
		messages: [...state.messages.values()]
			.sort((left, right) => {
				const leftTurn = left.turnId
					? (turnOrder.get(left.turnId) ?? Number.MAX_SAFE_INTEGER)
					: Number.MAX_SAFE_INTEGER;
				const rightTurn = right.turnId
					? (turnOrder.get(right.turnId) ?? Number.MAX_SAFE_INTEGER)
					: Number.MAX_SAFE_INTEGER;
				if (leftTurn !== rightTurn) return leftTurn - rightTurn;
				if (left.role !== right.role) {
					if (left.role === "user") return -1;
					if (right.role === "user") return 1;
				}
				return left.createdAt.localeCompare(right.createdAt);
			})
			.map((message) => ({
				...message,
				streaming:
					message.role === "assistant" &&
					message.turnId === latestTurn?.id &&
					latestTurn?.state === "running",
			})),
		toolCalls: [...state.toolCalls.values()],
		turns: orderedTurns,
	});

	if (!parsed.success) return Result.err(parsed.error);
	return Result.ok(parsed.data);
}
