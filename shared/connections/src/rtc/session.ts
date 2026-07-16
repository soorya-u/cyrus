import type { ConnectionError } from "@cyrus/errors/connection";
import {
	connectionErrorMessageFromUnknown,
	invalidHostError,
	signalingFailedError,
} from "@cyrus/errors/connection";
import type { DeviceRole } from "@cyrus/schemas/signaling";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import { Result } from "better-result";
import { PartySocket } from "partysocket";
import type { SignalingClient } from "../contracts/signaling";
import { createSignalingEvents, type SignalingEvents } from "./peer";

export type ConnectSignalingOptions = {
	host: string;
	room: string;
	id: string;
	name: string;
	role: DeviceRole;
	protocols: () => Promise<string[]>;
};

export type SignalingSession = {
	socket: PartySocket;
	signaling: SignalingClient;
	events: SignalingEvents;
	close(): void;
};

export type NormalizedHost = {
	host: string;
	protocol: "ws" | "wss";
};

export function normalizeHost(
	host: string
): Result<NormalizedHost, ConnectionError> {
	if (!host.includes("://")) {
		return Result.ok({ host, protocol: "ws" });
	}

	return Result.try({
		try: () => {
			const url = new URL(host);
			return {
				host: url.host,
				protocol:
					url.protocol === "https:" || url.protocol === "wss:" ? "wss" : "ws",
			} satisfies NormalizedHost;
		},
		catch: (error) =>
			invalidHostError(
				"Invalid signaling host",
				connectionErrorMessageFromUnknown(error)
			),
	});
}

// biome-ignore lint/suspicious/useAwait: returns a Promise via `new Promise`, not await
async function waitForPartySocketOpen(
	socket: PartySocket,
	timeoutMs = 30_000
): Promise<Result<void, ConnectionError>> {
	if (socket.readyState === WebSocket.OPEN) return Result.ok(undefined);

	return new Promise((resolve) => {
		const timeout = setTimeout(() => {
			cleanup();
			resolve(Result.err(signalingFailedError("WebSocket open timeout")));
		}, timeoutMs);

		const onOpen = () => {
			cleanup();
			resolve(Result.ok(undefined));
		};
		const onClose = () => {
			cleanup();
			resolve(Result.err(signalingFailedError("WebSocket closed before open")));
		};
		const cleanup = () => {
			clearTimeout(timeout);
			socket.removeEventListener("open", onOpen);
			socket.removeEventListener("close", onClose);
		};

		socket.addEventListener("open", onOpen);
		socket.addEventListener("close", onClose);
	});
}

export async function connectSignaling(
	options: ConnectSignalingOptions
): Promise<Result<SignalingSession, ConnectionError>> {
	const normalized = normalizeHost(options.host);
	if (normalized.isErr()) return Result.err(normalized.error);

	const { host, protocol } = normalized.value;

	const socket = new PartySocket({
		host,
		protocol,
		prefix: "ws",
		party: "hub",
		room: options.room,
		id: options.id,
		protocols: options.protocols,
	});

	const link = new RPCLink({ websocket: socket as unknown as WebSocket });
	const signaling: SignalingClient = createORPCClient(link);

	const openResult = await waitForPartySocketOpen(socket);
	if (openResult.isErr()) {
		socket.close();
		return Result.err(openResult.error);
	}

	const eventsResult = await Result.tryPromise({
		try: async () => {
			const stream = await signaling.onSignalingEvent({
				name: options.name,
				role: options.role,
			});
			return createSignalingEvents(stream);
		},
		catch: (error) =>
			signalingFailedError(
				"Failed to subscribe to signaling events",
				connectionErrorMessageFromUnknown(error)
			),
	});

	if (eventsResult.isErr()) {
		socket.close();
		return Result.err(eventsResult.error);
	}

	const events = eventsResult.value;

	return Result.ok({
		socket,
		signaling,
		events,
		close() {
			events.close();
			socket.close();
		},
	});
}
