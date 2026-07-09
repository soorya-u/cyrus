import type {
	AgentEvent,
	ToolCallContent,
} from "@cyrus/connections/schemas/rtc/chat";
import type { ConversationEntry } from "@cyrus/connections/schemas/rtc/threads";
import {
	type DiffView,
	type MessageView,
	type ThreadConversation,
	ThreadConversationSchema,
	type ToolCallView,
	type TurnView,
} from "@cyrus/schemas/view";
import { Result } from "better-result";

type MutableState = {
	messages: Map<string, MessageView>;
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
	const key = event.messageId ?? turnId;
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
	if (
		events.some(
			(event) =>
				event.type === "turn_completed" || event.type === "message_completed"
		)
	) {
		return "complete";
	}
	if (!isLatest) return "complete";

	const hasInProgressTool = events.some((event) => {
		if (event.type !== "tool_call" && event.type !== "tool_call_update") {
			return false;
		}
		return event.status === "pending" || event.status === "in_progress";
	});
	if (hasInProgressTool) return "running";

	const hasStreamingDelta = events.some(
		(event) => event.type === "token" || event.type === "thought"
	);
	if (hasStreamingDelta) return "running";

	const isAwaitingAgent = events.every(
		(event) => event.type === "user_message" || event.type === "thread_started"
	);
	if (isAwaitingAgent) return "running";

	return "complete";
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
): Result<ThreadConversation, unknown> {
	const state: MutableState = {
		diffs: new Map(),
		messages: new Map(),
		toolCalls: new Map(),
	};
	const turns = new Map<string, TurnView>();
	const entriesByTurn = new Map<string, ConversationEntry[]>();

	for (const entry of entries) {
		touchTurn(turns, entry.chunk.turnId, entry.threadId, entry.createdAt);
		applyEvent(state, entry);

		const turnEntries = entriesByTurn.get(entry.chunk.turnId) ?? [];
		turnEntries.push(entry);
		entriesByTurn.set(entry.chunk.turnId, turnEntries);
	}

	const orderedTurns = [...turns.values()];
	const latestTurn = orderedTurns.at(-1);

	for (const turn of orderedTurns) {
		const turnEntries = entriesByTurn.get(turn.id) ?? [];
		turn.state = inferTurnState(turnEntries, turn.id === latestTurn?.id);
	}

	const parsed = ThreadConversationSchema.safeParse({
		diffs: [...state.diffs.values()],
		messages: [...state.messages.values()].map((message) => ({
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
