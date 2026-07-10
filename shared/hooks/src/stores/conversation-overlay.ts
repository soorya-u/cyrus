import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";
import type { StoreApi } from "zustand";
import { create } from "zustand";

type OverlayEntry = {
	chunk: ChatChunk;
};

type ThreadOverlay = {
	snapshotHighWaterMark: number;
	live: OverlayEntry[];
	activeTurnIds: Set<string>;
};

type TurnWaiter = {
	resolve: () => void;
	reject: (error: Error) => void;
	onAbort?: () => void;
};

type ConversationOverlayState = {
	byThread: Map<string, ThreadOverlay>;
	applyWatermark: (threadId: string, snapshotHighWaterMark: number) => void;
	applySnapshot: (threadId: string, entries: ConversationEntry[]) => void;
	applyLiveChunk: (chunk: ChatChunk) => void;
	clearTurn: (threadId: string, turnId: string) => void;
	getLiveEntries: (threadId: string) => ConversationEntry[];
};

type OverlaySetState = StoreApi<ConversationOverlayState>["setState"];

let overlayEntrySeq = 0;

const turnWaiters = new Map<string, TurnWaiter>();
const pendingDeltas = new Map<string, ChatChunk>();
let deltaFlushHandle: ReturnType<typeof requestAnimationFrame> | null = null;

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

function flushPendingDeltas(commit: (chunk: ChatChunk) => void): void {
	if (deltaFlushHandle !== null) {
		cancelAnimationFrame(deltaFlushHandle);
		deltaFlushHandle = null;
	}
	for (const chunk of pendingDeltas.values()) {
		commit(chunk);
	}
	pendingDeltas.clear();
}

function scheduleStreamingDeltaFlush(commit: (chunk: ChatChunk) => void): void {
	if (deltaFlushHandle !== null) return;
	deltaFlushHandle = requestAnimationFrame(() => {
		deltaFlushHandle = null;
		flushPendingDeltas(commit);
	});
}

function queueStreamingDelta(
	chunk: ChatChunk,
	commit: (chunk: ChatChunk) => void
): void {
	const key = streamingDeltaKey(chunk);
	const existing = pendingDeltas.get(key);
	pendingDeltas.set(
		key,
		existing ? mergeStreamingDeltaChunks(existing, chunk) : chunk
	);
	scheduleStreamingDeltaFlush(commit);
}

function chunkToEntry(chunk: ChatChunk): ConversationEntry {
	return {
		id: `overlay-${chunk.turnId}-${++overlayEntrySeq}`,
		threadId: chunk.threadId,
		seq: chunk.seq,
		chunk,
		createdAt: new Date().toISOString(),
	};
}

function cloneOverlay(overlay: ThreadOverlay): ThreadOverlay {
	return {
		snapshotHighWaterMark: overlay.snapshotHighWaterMark,
		live: [...overlay.live],
		activeTurnIds: new Set(overlay.activeTurnIds),
	};
}

function getOrCreateOverlay(
	byThread: Map<string, ThreadOverlay>,
	threadId: string
): ThreadOverlay {
	const existing = byThread.get(threadId);
	if (existing) {
		const clone = cloneOverlay(existing);
		byThread.set(threadId, clone);
		return clone;
	}

	const overlay: ThreadOverlay = {
		snapshotHighWaterMark: 0,
		live: [],
		activeTurnIds: new Set(),
	};
	byThread.set(threadId, overlay);
	return overlay;
}

function settleTurnWaiter(
	threadId: string,
	turnId: string,
	outcome: "completed" | "interrupted"
): void {
	const key = turnKey(threadId, turnId);
	const waiter = turnWaiters.get(key);
	if (!waiter) return;

	turnWaiters.delete(key);
	if (outcome === "completed") {
		waiter.resolve();
		return;
	}
	waiter.reject(new Error("turn interrupted"));
}

function shouldSkipPersistedChunk(
	seq: number,
	overlay: ThreadOverlay
): boolean {
	if (seq <= 0) return false;
	if (seq <= overlay.snapshotHighWaterMark) return true;
	return overlay.live.some(({ chunk: live }) => live.seq === seq);
}

function upsertStreamingDelta(overlay: ThreadOverlay, chunk: ChatChunk): void {
	const deltaKey = streamingDeltaKey(chunk);
	const existingIndex = overlay.live.findIndex(
		({ chunk: live }) =>
			isStreamingDeltaChunk(live) && streamingDeltaKey(live) === deltaKey
	);
	if (existingIndex >= 0) {
		const existing = overlay.live[existingIndex];
		if (existing) {
			overlay.live[existingIndex] = {
				chunk: mergeStreamingDeltaChunks(existing.chunk, chunk),
			};
		}
		return;
	}
	overlay.live.push({ chunk });
}

function applyChunkToOverlay(overlay: ThreadOverlay, chunk: ChatChunk): void {
	const { turnId } = chunk;

	if (isStreamingDeltaChunk(chunk)) {
		upsertStreamingDelta(overlay, chunk);
	} else {
		overlay.live.push({ chunk });
	}

	if (isTerminalEvent(chunk.event)) {
		overlay.activeTurnIds.delete(turnId);
	} else {
		overlay.activeTurnIds.add(turnId);
	}
}

function commitLiveChunk(setState: OverlaySetState, chunk: ChatChunk): void {
	const { threadId, turnId, seq } = chunk;

	setState((state) => {
		const byThread = new Map<string, ThreadOverlay>(state.byThread);
		const overlay = getOrCreateOverlay(byThread, threadId);

		if (shouldSkipPersistedChunk(seq, overlay)) return state;

		applyChunkToOverlay(overlay, chunk);
		return { byThread };
	});

	if (chunk.event.type === "turn_completed")
		settleTurnWaiter(threadId, turnId, "completed");

	if (chunk.event.type === "turn_interrupted")
		settleTurnWaiter(threadId, turnId, "interrupted");
}

export const useConversationOverlay = create<ConversationOverlayState>(
	(set, get) => {
		const commit = (chunk: ChatChunk) => commitLiveChunk(set, chunk);

		return {
			byThread: new Map(),

			applyWatermark(threadId, snapshotHighWaterMark) {
				flushPendingDeltas(commit);
				set((state) => {
					const byThread = new Map(state.byThread);
					const overlay = getOrCreateOverlay(byThread, threadId);
					overlay.snapshotHighWaterMark = snapshotHighWaterMark;
					overlay.live = overlay.live.filter(
						({ chunk }) => chunk.seq === 0 || chunk.seq > snapshotHighWaterMark
					);
					return { byThread };
				});
			},

			applySnapshot(threadId, entries) {
				const snapshotHighWaterMark = entries.reduce(
					(max, entry) => Math.max(max, entry.seq),
					0
				);
				get().applyWatermark(threadId, snapshotHighWaterMark);
			},

			applyLiveChunk(chunk) {
				if (isStreamingDeltaChunk(chunk)) {
					queueStreamingDelta(chunk, commit);
					return;
				}

				flushPendingDeltas(commit);
				commitLiveChunk(set, chunk);
			},

			clearTurn(threadId, turnId) {
				flushPendingDeltas(commit);
				set((state) => {
					if (!state.byThread.has(threadId)) return state;

					const byThread = new Map(state.byThread);
					const overlay = getOrCreateOverlay(byThread, threadId);

					overlay.activeTurnIds.delete(turnId);
					overlay.live = overlay.live.filter(
						({ chunk }) => chunk.turnId !== turnId || chunk.seq > 0
					);
					return { byThread };
				});
			},

			getLiveEntries(threadId) {
				const overlay = get().byThread.get(threadId);
				if (!overlay) return [];
				return overlay.live.map(({ chunk }) => chunkToEntry(chunk));
			},
		};
	}
);

export function waitForTurnEnd(
	threadId: string,
	turnId: string,
	signal?: AbortSignal
): Promise<void> {
	return new Promise((resolve, reject) => {
		const key = turnKey(threadId, turnId);

		function cleanup() {
			signal?.removeEventListener("abort", onAbort);
			turnWaiters.delete(key);
		}

		function onAbort() {
			cleanup();
			reject(new Error("turn aborted"));
		}

		if (signal?.aborted) {
			onAbort();
			return;
		}

		signal?.addEventListener("abort", onAbort, { once: true });

		const overlay = useConversationOverlay.getState();
		const terminal = overlay
			.getLiveEntries(threadId)
			.find(
				(entry) =>
					entry.chunk.turnId === turnId &&
					(entry.chunk.event.type === "turn_completed" ||
						entry.chunk.event.type === "turn_interrupted")
			);
		if (terminal) {
			if (terminal.chunk.event.type === "turn_completed") {
				resolve();
			} else {
				reject(new Error("turn interrupted"));
			}
			return;
		}

		turnWaiters.set(key, {
			resolve: () => {
				cleanup();
				resolve();
			},
			reject: (error) => {
				cleanup();
				reject(error);
			},
			onAbort,
		});
	});
}
