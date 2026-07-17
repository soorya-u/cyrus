import type { ConnectionError } from "@cyrus/errors/connection";
import {
	connectionErrorMessageFromUnknown,
	dataChannelFailedError,
	dialFailedError,
	iceFailedError,
	isConnectionError,
} from "@cyrus/errors/connection";
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
	}).then((result) => {
		result.tapError(() => {
			// stream teardown can reject after the socket closes
		});
	});

	return {
		subscribe(handler) {
			handlers.add(handler);
			return () => handlers.delete(handler);
		},
		close() {
			active = false;
			handlers.clear();
			// Skip stream.return(): oRPC abort-sends race socket.close() and
			// reject into callers. Socket teardown ends the iterator instead.
		},
	};
}

type IceBuffer = {
	setRemote(
		description: RTCSessionDescriptionInit
	): Promise<Result<void, ConnectionError>>;
	addRemote(
		candidate: RTCIceCandidateInit
	): Promise<Result<void, ConnectionError>>;
};

// buffers remote ICE that arrives before setRemoteDescription resolves
export function createIceBuffer(pc: RTCPeerConnection): IceBuffer {
	const pending: RTCIceCandidateInit[] = [];
	let remoteReady = false;

	return {
		async setRemote(description: RTCSessionDescriptionInit) {
			const setRemoteResult = await Result.tryPromise({
				try: () => pc.setRemoteDescription(description),
				catch: (error) =>
					iceFailedError(
						"Failed to set remote description",
						connectionErrorMessageFromUnknown(error)
					),
			});
			if (setRemoteResult.isErr()) return setRemoteResult;

			remoteReady = true;
			while (pending.length > 0) {
				const candidate = pending.shift();
				if (!candidate) continue;
				const addResult = await Result.tryPromise({
					try: () => pc.addIceCandidate(candidate),
					catch: (error) =>
						iceFailedError(
							"Failed to add ICE candidate",
							connectionErrorMessageFromUnknown(error)
						),
				});
				if (addResult.isErr()) return addResult;
			}

			return Result.ok(undefined);
		},
		async addRemote(candidate: RTCIceCandidateInit) {
			if (!remoteReady) {
				pending.push(candidate);
				return Result.ok(undefined);
			}

			return await Result.tryPromise({
				try: () => pc.addIceCandidate(candidate),
				catch: (error) =>
					iceFailedError(
						"Failed to add ICE candidate",
						connectionErrorMessageFromUnknown(error)
					),
			});
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
export function whenOpen(
	channel: RTCDataChannel
): Promise<Result<void, ConnectionError>> {
	if (channel.readyState === "open") {
		return Promise.resolve(Result.ok(undefined));
	}

	return new Promise((resolve) => {
		channel.addEventListener("open", () => resolve(Result.ok(undefined)), {
			once: true,
		});
		channel.addEventListener(
			"error",
			() =>
				resolve(
					Result.err(dataChannelFailedError("data channel failed to open"))
				),
			{ once: true }
		);
		channel.addEventListener(
			"close",
			() =>
				resolve(
					Result.err(
						dataChannelFailedError("data channel closed before opening")
					)
				),
			{ once: true }
		);
	});
}

export function mapUnknownToDialError(error: unknown): ConnectionError {
	if (isConnectionError(error)) return error;

	return dialFailedError(
		"Failed to establish RTC connection",
		connectionErrorMessageFromUnknown(error)
	);
}
