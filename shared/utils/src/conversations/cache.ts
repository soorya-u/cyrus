import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import type {
	ConversationEntry,
	GetConversationsOutput,
} from "@cyrus/schemas/rtc/threads";
import type { QueryClient } from "@tanstack/react-query";

/** Minimum ms between streaming delta commits — keeps token rendering readable. */
const STREAM_DELTA_MIN_MS = 120;

let syntheticEntrySeq = 0;
const pendingDeltas = new Map<string, ChatChunk>();
const completedTurnKeys = new Set<string>();
let deltaFlushHandle: ReturnType<typeof setTimeout> | null = null;
let lastDeltaFlushAt = 0;

function turnKey(threadId: string, turnId: string): string {
	return `${threadId}:${turnId}`;
}

function isTerminalEvent(event: ChatChunk["event"]): boolean {
	return event.type === "turn_completed" || event.type === "turn_interrupted";
}

function isStreamingDeltaChunk(chunk: ChatChunk): boolean {
	return (
		chunk.seq === 0 &&
		(chunk.event.type === "token" || chunk.event.type === "thought")
	);
}

function streamingDeltaKey(chunk: ChatChunk): string {
	const messageId =
		chunk.event.type === "token" || chunk.event.type === "thought"
			? (chunk.event.messageId ?? "default")
			: "default";
	return `${chunk.threadId}:${chunk.turnId}:${chunk.event.type}:${messageId}`;
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
	return incoming;
}

function entryIdForChunk(chunk: ChatChunk): string {
	const messageId =
		chunk.event.type === "token" || chunk.event.type === "thought"
			? (chunk.event.messageId ?? "default")
			: "";
	return `local-${chunk.turnId}-${chunk.seq}-${chunk.event.type}-${messageId}`;
}

function chunkToEntry(chunk: ChatChunk, id?: string): ConversationEntry {
	return {
		id: id ?? `${entryIdForChunk(chunk)}-${++syntheticEntrySeq}`,
		threadId: chunk.threadId,
		seq: chunk.seq,
		chunk,
		createdAt: new Date().toISOString(),
	};
}

function dropRedundantEphemeralUserMessages(
	entries: ConversationEntry[]
): ConversationEntry[] {
	const persistedUserTurns = new Set(
		entries
			.filter(
				(entry) => entry.seq > 0 && entry.chunk.event.type === "user_message"
			)
			.map((entry) => entry.chunk.turnId)
	);

	if (persistedUserTurns.size === 0) return entries;

	return entries.filter(
		(entry) =>
			!(
				entry.seq === 0 &&
				entry.chunk.event.type === "user_message" &&
				persistedUserTurns.has(entry.chunk.turnId)
			)
	);
}

function sortEntries(entries: ConversationEntry[]): ConversationEntry[] {
	return [...entries].sort((left, right) => {
		if (left.seq !== right.seq) {
			if (left.seq === 0) return 1;
			if (right.seq === 0) return -1;
			return left.seq - right.seq;
		}
		return left.createdAt.localeCompare(right.createdAt);
	});
}

export function mergeConversationEntries(
	cached: ConversationEntry[],
	fetched: ConversationEntry[]
): ConversationEntry[] {
	if (cached.length === 0) return sortEntries(fetched);
	if (fetched.length === 0) return sortEntries(cached);

	const merged = new Map<string, ConversationEntry>();

	for (const entry of fetched) {
		if (entry.seq > 0) merged.set(`seq-${entry.seq}`, entry);
	}

	for (const entry of cached) {
		if (entry.seq > 0) {
			if (!merged.has(`seq-${entry.seq}`))
				merged.set(`seq-${entry.seq}`, entry);
			continue;
		}
		merged.set(entry.id, entry);
	}

	return dropRedundantEphemeralUserMessages(sortEntries([...merged.values()]));
}

function updateCache(
	queryClient: QueryClient,
	threadId: string,
	updater: (entries: ConversationEntry[]) => ConversationEntry[]
): void {
	queryClient.setQueryData<GetConversationsOutput>(
		RTC_OPERATION_KEYS.getConversations(threadId),
		(old) => ({
			conversations: dropRedundantEphemeralUserMessages(
				sortEntries(updater(old?.conversations ?? []))
			),
		})
	);
}

function shouldSkipChunk(
	entries: ConversationEntry[],
	chunk: ChatChunk
): boolean {
	if (chunk.seq <= 0) return false;
	return entries.some((entry) => entry.seq === chunk.seq);
}

function applyChunkToEntries(
	entries: ConversationEntry[],
	chunk: ChatChunk
): ConversationEntry[] {
	const key = turnKey(chunk.threadId, chunk.turnId);

	if (completedTurnKeys.has(key) && !isTerminalEvent(chunk.event))
		return entries;

	if (shouldSkipChunk(entries, chunk)) return entries;

	let next = [...entries];

	if (chunk.event.type === "user_message" && chunk.seq > 0) {
		next = next.filter(
			(entry) =>
				!(
					entry.chunk.turnId === chunk.turnId &&
					entry.seq === 0 &&
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
		isTerminalEvent(chunk.event) &&
		next.some(
			(entry) =>
				entry.chunk.turnId === chunk.turnId &&
				isTerminalEvent(entry.chunk.event)
		)
	)
		return next;

	next.push(chunkToEntry(chunk));

	if (isTerminalEvent(chunk.event)) completedTurnKeys.add(key);

	return next;
}

function commitChunk(queryClient: QueryClient, chunk: ChatChunk): void {
	updateCache(queryClient, chunk.threadId, (entries) =>
		applyChunkToEntries(entries, chunk)
	);
}

function flushPendingDeltas(queryClient: QueryClient): void {
	if (deltaFlushHandle !== null) {
		clearTimeout(deltaFlushHandle);
		deltaFlushHandle = null;
	}
	for (const chunk of pendingDeltas.values()) commitChunk(queryClient, chunk);

	pendingDeltas.clear();
}

function flushPendingDeltasForTurn(
	queryClient: QueryClient,
	turnId: string
): void {
	for (const [key, chunk] of pendingDeltas) {
		if (chunk.turnId !== turnId) continue;
		commitChunk(queryClient, chunk);
		pendingDeltas.delete(key);
	}
}

function canPruneEphemeralTurn(
	entries: ConversationEntry[],
	turnId: string
): boolean {
	return entries.some(
		(entry) =>
			entry.chunk.turnId === turnId &&
			entry.seq > 0 &&
			(entry.chunk.event.type === "message_completed" ||
				entry.chunk.event.type === "reasoning_completed" ||
				entry.chunk.event.type === "turn_completed")
	);
}

export function pruneEphemeralTurnEntries(
	queryClient: QueryClient,
	threadId: string,
	turnId: string
): void {
	updateCache(queryClient, threadId, (entries) => {
		if (!canPruneEphemeralTurn(entries, turnId)) return entries;
		completedTurnKeys.delete(turnKey(threadId, turnId));
		return entries.filter(
			(entry) => !(entry.chunk.turnId === turnId && entry.seq === 0)
		);
	});
}

function scheduleStreamingDeltaFlush(queryClient: QueryClient): void {
	if (deltaFlushHandle !== null) return;
	const elapsed = Date.now() - lastDeltaFlushAt;
	const delay = Math.max(0, STREAM_DELTA_MIN_MS - elapsed);
	deltaFlushHandle = setTimeout(() => {
		deltaFlushHandle = null;
		lastDeltaFlushAt = Date.now();
		flushPendingDeltas(queryClient);
	}, delay);
}

function queueStreamingDelta(queryClient: QueryClient, chunk: ChatChunk): void {
	const key = streamingDeltaKey(chunk);
	const existing = pendingDeltas.get(key);
	pendingDeltas.set(
		key,
		existing ? mergeStreamingDeltaChunks(existing, chunk) : chunk
	);
	scheduleStreamingDeltaFlush(queryClient);
}

export function applyChunkToCache(
	queryClient: QueryClient,
	chunk: ChatChunk
): void {
	if (isStreamingDeltaChunk(chunk)) {
		if (completedTurnKeys.has(turnKey(chunk.threadId, chunk.turnId))) return;
		queueStreamingDelta(queryClient, chunk);
		return;
	}

	if (isTerminalEvent(chunk.event)) {
		flushPendingDeltasForTurn(queryClient, chunk.turnId);
		flushPendingDeltas(queryClient);
	} else {
		flushPendingDeltas(queryClient);
	}

	commitChunk(queryClient, chunk);

	if (isTerminalEvent(chunk.event)) {
		pruneEphemeralTurnEntries(queryClient, chunk.threadId, chunk.turnId);
		if (chunk.event.type === "turn_interrupted") {
			completedTurnKeys.delete(turnKey(chunk.threadId, chunk.turnId));
		}
	}
}

export function appendOptimisticUserMessage(
	queryClient: QueryClient,
	threadId: string,
	turnId: string,
	message: string
): void {
	flushPendingDeltas(queryClient);
	commitChunk(queryClient, {
		threadId,
		turnId,
		seq: 0,
		event: { type: "user_message", content: message },
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
		seq: 0,
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
