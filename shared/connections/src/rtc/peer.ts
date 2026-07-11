import type { ServerEvent } from "@cyrus/schemas/signaling";
import { Result } from "better-result";
import type { SignalingClient } from "../contracts/signaling";
import type { ThreadEventBus } from "./bus";

export type { SignalingClient } from "../contracts/signaling";
export type { ThreadEventBus } from "./bus";

export type RtcContext = {
	peerId: string;
	eventBus: ThreadEventBus;
};

// fans one signaling event stream out to many subscribers (one socket, many peers)
export type SignalingEvents = {
	subscribe(handler: (event: ServerEvent) => void): () => void;
	close(): void;
};

export function createSignalingEvents(
	stream: AsyncIterable<ServerEvent>
): SignalingEvents {
	const handlers = new Set<(event: ServerEvent) => void>();
	let active = true;

	Result.tryPromise(async () => {
		for await (const event of stream) {
			if (!active) break;

			for (const handler of handlers) handler(event);
		}
	}).catch(() => {
		// stream teardown can reject after the socket closes
	});

	return {
		subscribe(handler) {
			handlers.add(handler);
			return () => handlers.delete(handler);
		},
		close() {
			active = false;
			handlers.clear();
			(stream as AsyncGenerator).return?.(undefined);
		},
	};
}

// buffers remote ICE that arrives before setRemoteDescription resolves
export function createIceBuffer(pc: RTCPeerConnection) {
	const pending: RTCIceCandidateInit[] = [];
	let remoteReady = false;

	return {
		async setRemote(description: RTCSessionDescriptionInit) {
			await pc.setRemoteDescription(description);
			remoteReady = true;
			while (pending.length > 0) {
				const candidate = pending.shift();
				if (candidate) {
					await pc.addIceCandidate(candidate);
				}
			}
		},
		async addRemote(candidate: RTCIceCandidateInit) {
			if (remoteReady) {
				await pc.addIceCandidate(candidate);
			} else {
				pending.push(candidate);
			}
		},
	};
}

// relays this peer's locally gathered ICE candidates to `to` via signaling
export function relayLocalIce(
	pc: RTCPeerConnection,
	signaling: SignalingClient,
	to: string
): void {
	pc.addEventListener("icecandidate", (event) => {
		const { candidate } = event;
		if (candidate) {
			signaling
				.iceCandidate({
					to,
					candidate: {
						candidate: candidate.candidate,
						sdpMid: candidate.sdpMid,
						sdpMLineIndex: candidate.sdpMLineIndex,
						usernameFragment: candidate.usernameFragment,
					},
				})
				.catch(() => {
					// transient signaling failure; ICE will timeout naturally
				});
		}
	});
}

// resolves once the data channel reaches the `open` state
export function whenOpen(channel: RTCDataChannel): Promise<void> {
	if (channel.readyState === "open") {
		return Promise.resolve();
	}
	return new Promise((resolve, reject) => {
		channel.addEventListener("open", () => resolve(), { once: true });
		channel.addEventListener(
			"error",
			() => reject(new Error("data channel failed to open")),
			{ once: true }
		);
		channel.addEventListener(
			"close",
			() => reject(new Error("data channel closed before opening")),
			{ once: true }
		);
	});
}
