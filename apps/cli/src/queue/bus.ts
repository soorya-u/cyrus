import type { ThreadEventBus } from "@cyrus/connections/rtc/bus";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";

const DEFAULT_MAX_CHUNKS_PER_TURN = 10_000;

type PeerDelivery = {
	queue: ChatChunk[];
	resolve: (() => void) | null;
	closed: boolean;
};

export type CreateThreadEventBusOptions = {
	maxChunksPerTurn?: number;
};

function isTerminalEvent(event: ChatChunk["event"]): boolean {
	return event.type === "turn_completed" || event.type === "turn_interrupted";
}

export function createThreadEventBus(
	options: CreateThreadEventBusOptions = {}
): ThreadEventBus {
	const { maxChunksPerTurn = DEFAULT_MAX_CHUNKS_PER_TURN } = options;

	const peers = new Map<string, PeerDelivery>();
	const watchedThreads = new Map<string, Set<string>>();
	const activeTurnLogs = new Map<string, ChatChunk[]>();
	const turnThreads = new Map<string, string>();
	let closed = false;

	function getWatchedThreads(peerId: string): Set<string> {
		let set = watchedThreads.get(peerId);
		if (!set) {
			set = new Set();
			watchedThreads.set(peerId, set);
		}
		return set;
	}

	function closePeerDelivery(peerId: string): void {
		const peer = peers.get(peerId);
		if (peer) {
			peer.closed = true;
			peer.resolve?.();
		}
	}

	function deliver(peerId: string, chunk: ChatChunk): void {
		const peer = peers.get(peerId);
		if (!peer || peer.closed) return;
		peer.queue.push(chunk);
		peer.resolve?.();
		peer.resolve = null;
	}

	function fanOut(chunk: ChatChunk): void {
		for (const [peerId, threads] of watchedThreads) {
			if (threads.has(chunk.threadId)) {
				deliver(peerId, chunk);
			}
		}
	}

	function trimTurnLog(log: ChatChunk[]): void {
		while (log.length > maxChunksPerTurn) {
			const deltaIndex = log.findIndex((chunk) => chunk.seq === 0);
			if (deltaIndex === -1) break;
			log.splice(deltaIndex, 1);
		}
		while (log.length > maxChunksPerTurn) log.shift();
	}

	function appendToTurnLog(chunk: ChatChunk): void {
		const { turnId } = chunk;
		let log = activeTurnLogs.get(turnId);
		if (!log) {
			log = [];
			activeTurnLogs.set(turnId, log);
			turnThreads.set(turnId, chunk.threadId);
		}
		log.push(chunk);
		trimTurnLog(log);
	}

	function evictTurnLog(turnId: string): void {
		activeTurnLogs.delete(turnId);
		turnThreads.delete(turnId);
	}

	function replayThread(peerId: string, threadId: string): void {
		for (const [turnId, log] of activeTurnLogs) {
			if (turnThreads.get(turnId) !== threadId) continue;
			for (const chunk of log) deliver(peerId, chunk);
		}
	}

	function registerWatch(peerId: string, threadId: string): void {
		const threads = getWatchedThreads(peerId);
		const isNew = !threads.has(threadId);
		threads.add(threadId);
		if (isNew) replayThread(peerId, threadId);
	}

	return {
		publish(chunk) {
			if (closed) return;

			const terminal = isTerminalEvent(chunk.event);
			if (!terminal) {
				appendToTurnLog(chunk);
			}
			fanOut(chunk);
			if (terminal) {
				evictTurnLog(chunk.turnId);
			}
		},

		watch(peerId, threadId) {
			registerWatch(peerId, threadId);
		},

		unwatch(peerId, threadId) {
			watchedThreads.get(peerId)?.delete(threadId);
		},

		ensureWatch(peerId, threadId) {
			if (!getWatchedThreads(peerId).has(threadId)) {
				registerWatch(peerId, threadId);
			}
		},

		isWatching(peerId, threadId) {
			return watchedThreads.get(peerId)?.has(threadId) ?? false;
		},

		getActiveTurnIdsForThread(threadId) {
			const turnIds: string[] = [];
			for (const turnId of activeTurnLogs.keys()) {
				if (turnThreads.get(turnId) === threadId) turnIds.push(turnId);
			}
			return turnIds;
		},

		async *subscribe(peerId) {
			closePeerDelivery(peerId);
			const peer: PeerDelivery = {
				queue: [],
				resolve: null,
				closed: false,
			};
			peers.set(peerId, peer);

			for (const threadId of getWatchedThreads(peerId)) {
				replayThread(peerId, threadId);
			}

			try {
				while (!peer.closed) {
					while (peer.queue.length > 0) {
						yield peer.queue.shift() as ChatChunk;
					}
					if (!peer.closed) {
						await new Promise<void>((resolve) => {
							peer.resolve = resolve;
						});
					}
				}
			} finally {
				if (peers.get(peerId) === peer) {
					peers.delete(peerId);
				}
			}
		},

		close(peerId) {
			closePeerDelivery(peerId);
			watchedThreads.delete(peerId);
		},

		closeAll() {
			closed = true;
			for (const peerId of [...peers.keys()]) {
				closePeerDelivery(peerId);
			}
			peers.clear();
			watchedThreads.clear();
			activeTurnLogs.clear();
			turnThreads.clear();
		},
	};
}
