export type PeerBroadcaster<T = unknown> = {
	broadcast(event: T, fromPeerId: string): void;
	subscribe(peerId: string): AsyncGenerator<T>;
	close(peerId: string): void;
	closeAll(): void;
};

export function createPeerBroadcaster<T = unknown>(): PeerBroadcaster<T> {
	const peers = new Map<
		string,
		{ queue: T[]; resolve: (() => void) | null; closed: boolean }
	>();

	function close(peerId: string): void {
		const peer = peers.get(peerId);
		if (peer) {
			peer.closed = true;
			peer.resolve?.();
		}
	}

	return {
		broadcast(event, fromPeerId) {
			for (const [id, peer] of peers) {
				if (id !== fromPeerId) {
					peer.queue.push(event);
					peer.resolve?.();
					peer.resolve = null;
				}
			}
		},

		async *subscribe(peerId) {
			close(peerId);
			const peer = {
				queue: [] as T[],
				resolve: null as (() => void) | null,
				closed: false,
			};
			peers.set(peerId, peer);
			try {
				while (!peer.closed) {
					while (peer.queue.length > 0) {
						yield peer.queue.shift() as T;
					}
					if (!peer.closed) {
						await new Promise<void>((r) => (peer.resolve = r));
					}
				}
			} finally {
				if (peers.get(peerId) === peer) {
					peers.delete(peerId);
				}
			}
		},

		close,

		closeAll() {
			for (const id of [...peers.keys()]) {
				close(id);
			}
		},
	};
}
