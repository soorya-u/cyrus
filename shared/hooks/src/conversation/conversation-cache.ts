import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { ChatChunk, ChatMessage } from "@cyrus/schemas/rtc/chat";
import type {
	ConversationEntry,
	GetConversationsOutput,
} from "@cyrus/schemas/rtc/threads";
import {
	currentMaxPersistedSeq,
	sortConversationEntries,
} from "@cyrus/utils/conversations/entries";
import {
	isTerminalEvent,
	settleTurnWaiter,
} from "@cyrus/utils/conversations/turn-waiters";
import { Throttler } from "@tanstack/pacer";
import type { QueryClient } from "@tanstack/react-query";

/** Minimum ms between streaming delta commits — keeps token rendering readable. */
const STREAM_DELTA_MIN_MS = 120;

let syntheticEntrySeq = 0;
const pendingDeltas = new Map<string, ChatChunk>();
const completedTurnKeys = new Set<string>();
const deltaThrottler = new Throttler(
	(queryClient: QueryClient) => flushPendingDeltas(queryClient),
	{ wait: STREAM_DELTA_MIN_MS }
);

function correlationId(
	chunk: Pick<ChatChunk, "turnId" | "shellExecutionId">
): string {
	return chunk.turnId ?? chunk.shellExecutionId ?? "";
}

function isCorrelationTerminal(event: ChatChunk["event"]): boolean {
	return isTerminalEvent(event) || event.type === "shell_execution_end";
}

function turnKey(threadId: string, correlationKey: string): string {
	return `${threadId}:${correlationKey}`;
}

function isStreamingDeltaChunk(chunk: ChatChunk): boolean {
	return (
		chunk.sub !== undefined &&
		(chunk.event.type === "token" ||
			chunk.event.type === "thought" ||
			chunk.event.type === "shell_execution_line")
	);
}

function streamingDeltaKey(chunk: ChatChunk): string {
	const messageId =
		chunk.event.type === "token" || chunk.event.type === "thought"
			? (chunk.event.messageId ?? "default")
			: "default";
	return `${chunk.threadId}:${correlationId(chunk)}:${chunk.event.type}:${messageId}`;
}

function mergeStreamingDeltaChunks(
	existing: ChatChunk,
	incoming: ChatChunk
): ChatChunk {
	const left = existing.event;
	const right = incoming.event;
	if (left.type === "token" && right.type === "token") {
		return {
			...incoming,
			event: { ...left, text: left.text + right.text },
		};
	}
	if (left.type === "thought" && right.type === "thought") {
		return {
			...incoming,
			event: { ...left, text: left.text + right.text },
		};
	}
	if (
		left.type === "shell_execution_line" &&
		right.type === "shell_execution_line"
	) {
		return {
			...incoming,
			event: { ...right, lines: [...left.lines, ...right.lines] },
		};
	}
	return incoming;
}

function entryIdForChunk(chunk: ChatChunk): string {
	const messageId =
		chunk.event.type === "token" || chunk.event.type === "thought"
			? (chunk.event.messageId ?? "default")
			: "";
	return `local-${correlationId(chunk)}-${chunk.seq}-${chunk.event.type}-${messageId}`;
}

function chunkToEntry(chunk: ChatChunk, id?: string): ConversationEntry {
	return {
		id: id ?? `${entryIdForChunk(chunk)}-${++syntheticEntrySeq}`,
		threadId: chunk.threadId,
		seq: chunk.seq,
		sub: chunk.sub,
		chunk,
		createdAt: new Date().toISOString(),
	};
}

function currentEntries(
	queryClient: QueryClient,
	threadId: string
): ConversationEntry[] {
	return (
		queryClient.getQueryData<GetConversationsOutput>(
			RTC_OPERATION_KEYS.getConversations(threadId)
		)?.conversations ?? []
	);
}

function updateCache(
	queryClient: QueryClient,
	threadId: string,
	updater: (entries: ConversationEntry[]) => ConversationEntry[]
): void {
	queryClient.setQueryData<GetConversationsOutput>(
		RTC_OPERATION_KEYS.getConversations(threadId),
		(old) => ({
			conversations: sortConversationEntries(updater(old?.conversations ?? [])),
		})
	);
}

function shouldSkipChunk(
	entries: ConversationEntry[],
	chunk: ChatChunk
): boolean {
	if (chunk.sub !== undefined || chunk.seq <= 0) return false;
	return entries.some(
		(entry) => entry.sub === undefined && entry.seq === chunk.seq
	);
}

function applyChunkToEntries(
	entries: ConversationEntry[],
	chunk: ChatChunk
): ConversationEntry[] {
	const chunkKey = correlationId(chunk);
	const key = turnKey(chunk.threadId, chunkKey);

	if (completedTurnKeys.has(key) && !isCorrelationTerminal(chunk.event))
		return entries;

	if (shouldSkipChunk(entries, chunk)) return entries;

	let next = [...entries];

	if (chunk.event.type === "user_message" && chunk.sub === undefined) {
		next = next.filter(
			(entry) =>
				!(
					entry.chunk.turnId === chunk.turnId &&
					entry.sub !== undefined &&
					entry.chunk.event.type === "user_message"
				)
		);
	}

	if (isStreamingDeltaChunk(chunk)) {
		const deltaKey = streamingDeltaKey(chunk);
		const existingIndex = next.findIndex(
			(entry) =>
				isStreamingDeltaChunk(entry.chunk) &&
				streamingDeltaKey(entry.chunk) === deltaKey
		);
		if (existingIndex >= 0) {
			const existing = next[existingIndex];
			if (existing) {
				next[existingIndex] = {
					...existing,
					chunk: mergeStreamingDeltaChunks(existing.chunk, chunk),
				};
			}
			return next;
		}
	}

	if (
		isCorrelationTerminal(chunk.event) &&
		next.some(
			(entry) =>
				correlationId(entry.chunk) === chunkKey &&
				isCorrelationTerminal(entry.chunk.event)
		)
	)
		return next;

	next.push(chunkToEntry(chunk));

	if (isCorrelationTerminal(chunk.event)) completedTurnKeys.add(key);

	return next;
}

function commitChunk(queryClient: QueryClient, chunk: ChatChunk): void {
	updateCache(queryClient, chunk.threadId, (entries) =>
		applyChunkToEntries(entries, chunk)
	);
	if (chunk.turnId) settleTurnWaiter(chunk.threadId, chunk.turnId, chunk.event);
}

function flushPendingDeltas(queryClient: QueryClient): void {
	deltaThrottler.cancel();
	for (const chunk of pendingDeltas.values()) commitChunk(queryClient, chunk);

	pendingDeltas.clear();
}

function flushPendingDeltasForTurn(
	queryClient: QueryClient,
	groupId: string
): void {
	for (const [key, chunk] of pendingDeltas) {
		if (correlationId(chunk) !== groupId) continue;
		commitChunk(queryClient, chunk);
		pendingDeltas.delete(key);
	}
}

function canPruneEphemeralTurn(
	entries: ConversationEntry[],
	groupId: string
): boolean {
	return entries.some(
		(entry) =>
			correlationId(entry.chunk) === groupId &&
			entry.sub === undefined &&
			(entry.chunk.event.type === "message_completed" ||
				entry.chunk.event.type === "reasoning_completed" ||
				entry.chunk.event.type === "turn_completed" ||
				entry.chunk.event.type === "shell_execution_end")
	);
}

export function pruneEphemeralTurnEntries(
	queryClient: QueryClient,
	threadId: string,
	groupId: string
): void {
	updateCache(queryClient, threadId, (entries) => {
		if (!canPruneEphemeralTurn(entries, groupId)) return entries;
		completedTurnKeys.delete(turnKey(threadId, groupId));
		return entries.filter(
			(entry) =>
				!(correlationId(entry.chunk) === groupId && entry.sub !== undefined)
		);
	});
}

function queueStreamingDelta(queryClient: QueryClient, chunk: ChatChunk): void {
	const key = streamingDeltaKey(chunk);
	const existing = pendingDeltas.get(key);
	pendingDeltas.set(
		key,
		existing ? mergeStreamingDeltaChunks(existing, chunk) : chunk
	);
	deltaThrottler.maybeExecute(queryClient);
}

export function applyChunkToCache(
	queryClient: QueryClient,
	chunk: ChatChunk
): void {
	const groupId = correlationId(chunk);

	if (isStreamingDeltaChunk(chunk)) {
		if (completedTurnKeys.has(turnKey(chunk.threadId, groupId))) return;
		queueStreamingDelta(queryClient, chunk);
		return;
	}

	if (isCorrelationTerminal(chunk.event)) {
		flushPendingDeltasForTurn(queryClient, groupId);
		flushPendingDeltas(queryClient);
	} else {
		flushPendingDeltas(queryClient);
	}

	commitChunk(queryClient, chunk);

	if (isCorrelationTerminal(chunk.event)) {
		pruneEphemeralTurnEntries(queryClient, chunk.threadId, groupId);
		if (chunk.event.type === "turn_interrupted") {
			completedTurnKeys.delete(turnKey(chunk.threadId, groupId));
		}
	}
}

export function appendOptimisticUserMessage(
	queryClient: QueryClient,
	threadId: string,
	turnId: string,
	message: string,
	blocks?: ChatMessage
): void {
	flushPendingDeltas(queryClient);
	commitChunk(queryClient, {
		threadId,
		turnId,
		seq: currentMaxPersistedSeq(currentEntries(queryClient, threadId)),
		sub: 0,
		event: { type: "user_message", content: message, blocks },
	});
}

export function appendTurnTerminal(
	queryClient: QueryClient,
	threadId: string,
	turnId: string,
	type: "turn_completed" | "turn_interrupted"
): void {
	flushPendingDeltasForTurn(queryClient, turnId);
	flushPendingDeltas(queryClient);
	commitChunk(queryClient, {
		threadId,
		turnId,
		seq: currentMaxPersistedSeq(currentEntries(queryClient, threadId)),
		sub: 0,
		event: { type },
	});
}

export function removeTurnFromCache(
	queryClient: QueryClient,
	threadId: string,
	turnId: string
): void {
	flushPendingDeltasForTurn(queryClient, turnId);
	flushPendingDeltas(queryClient);
	completedTurnKeys.delete(turnKey(threadId, turnId));
	updateCache(queryClient, threadId, (entries) =>
		entries.filter((entry) => entry.chunk.turnId !== turnId)
	);
}
