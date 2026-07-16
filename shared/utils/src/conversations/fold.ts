import type { AgentEvent, ToolCallContent } from "@cyrus/schemas/rtc/chat";
import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";
import {
	type ApprovalView,
	type DiffView,
	type ElicitationView,
	type ErrorView,
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
	errors: Map<string, ErrorView>;
	approvals: Map<string, ApprovalView>;
	elicitations: Map<string, ElicitationView>;
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
	turnId: string,
	toolCallId?: string
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
			toolCallId,
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
		existing.blocks = event.blocks;
		if (entry.createdAt < existing.createdAt) {
			existing.createdAt = entry.createdAt;
		}
		return;
	}
	state.messages.set(key, {
		content: event.content,
		blocks: event.blocks,
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
	upsertDiffs(state.diffs, event.content, turnId, event.toolCallId);
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
	upsertDiffs(state.diffs, event.content, turnId, event.toolCallId);
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

function applyThreadError(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "thread_error" }>,
	turnId: string
): void {
	const key = `error-${entry.id}`;
	state.errors.set(key, {
		code: event.code,
		createdAt: entry.createdAt,
		id: key,
		message: event.message,
		turnId,
	});
}

function applyApprovalRequest(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "approval_request" }>,
	turnId: string
): void {
	const toolCallId = event.request.toolCall.toolCallId ?? entry.id;
	const key = `approval-${toolCallId}`;
	state.approvals.set(key, {
		createdAt: entry.createdAt,
		id: key,
		options: event.request.options.map((option) => ({
			kind: String(option.kind),
			name: option.name,
			optionId: option.optionId,
		})),
		sessionId: event.request.sessionId,
		threadId: entry.threadId,
		title: event.request.toolCall.title ?? undefined,
		toolCallId,
		turnId,
	});
}

function applyElicitationRequest(
	state: MutableState,
	entry: ConversationEntry,
	event: Extract<AgentEvent, { type: "elicitation_request" }>,
	turnId: string
): void {
	const key = `elicitation-${event.request.elicitationId}`;
	state.elicitations.set(key, {
		createdAt: entry.createdAt,
		elicitationId: event.request.elicitationId,
		id: key,
		message: event.request.message,
		mode: event.request.mode,
		requestedSchema:
			event.request.mode === "form" ? event.request.requestedSchema : undefined,
		sessionId: event.sessionId,
		threadId: entry.threadId,
		turnId,
		url: event.request.mode === "url" ? event.request.url : undefined,
	});
}

function applyApprovalResolved(
	state: MutableState,
	event: Extract<AgentEvent, { type: "approval_resolved" }>
): void {
	const key = `approval-${event.toolCallId}`;
	const existing = state.approvals.get(key);
	if (existing) existing.resolved = true;
}

function applyElicitationResolved(
	state: MutableState,
	event: Extract<AgentEvent, { type: "elicitation_resolved" }>
): void {
	const key = `elicitation-${event.elicitationId}`;
	const existing = state.elicitations.get(key);
	if (existing) existing.resolved = true;
}

function resolveInteractiveForTurn(state: MutableState, turnId: string): void {
	for (const approval of state.approvals.values()) {
		if (approval.turnId === turnId) approval.resolved = true;
	}
	for (const elicitation of state.elicitations.values()) {
		if (elicitation.turnId === turnId) elicitation.resolved = true;
	}
}

function inferTurnState(
	turnEntries: ConversationEntry[],
	isLatest: boolean
): TurnView["state"] {
	const events = turnEntries.map((entry) => entry.chunk.event);

	if (events.some((event) => event.type === "turn_interrupted")) {
		return "interrupted";
	}
	if (events.some((event) => event.type === "thread_error")) {
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
		case "thread_error":
			applyThreadError(state, entry, event, turnId);
			return;
		case "approval_request":
			applyApprovalRequest(state, entry, event, turnId);
			return;
		case "approval_resolved":
			applyApprovalResolved(state, event);
			return;
		case "elicitation_request":
			applyElicitationRequest(state, entry, event, turnId);
			return;
		case "elicitation_resolved":
			applyElicitationResolved(state, event);
			return;
		case "turn_completed":
		case "turn_interrupted":
			resolveInteractiveForTurn(state, turnId);
			return;
		default:
			return;
	}
}

export function fold(
	entries: ConversationEntry[]
): Result<ThreadConversation, ZodError> {
	const state: MutableState = {
		approvals: new Map(),
		diffs: new Map(),
		elicitations: new Map(),
		errors: new Map(),
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
		approvals: [...state.approvals.values()].sort((left, right) => {
			const leftTurn = turnOrder.get(left.turnId) ?? Number.MAX_SAFE_INTEGER;
			const rightTurn = turnOrder.get(right.turnId) ?? Number.MAX_SAFE_INTEGER;
			if (leftTurn !== rightTurn) return leftTurn - rightTurn;
			return left.createdAt.localeCompare(right.createdAt);
		}),
		diffs: [...state.diffs.values()],
		elicitations: [...state.elicitations.values()].sort((left, right) => {
			const leftTurn = turnOrder.get(left.turnId) ?? Number.MAX_SAFE_INTEGER;
			const rightTurn = turnOrder.get(right.turnId) ?? Number.MAX_SAFE_INTEGER;
			if (leftTurn !== rightTurn) return leftTurn - rightTurn;
			return left.createdAt.localeCompare(right.createdAt);
		}),
		errors: [...state.errors.values()].sort((left, right) => {
			const leftTurn = turnOrder.get(left.turnId) ?? Number.MAX_SAFE_INTEGER;
			const rightTurn = turnOrder.get(right.turnId) ?? Number.MAX_SAFE_INTEGER;
			if (leftTurn !== rightTurn) return leftTurn - rightTurn;
			return left.createdAt.localeCompare(right.createdAt);
		}),
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
