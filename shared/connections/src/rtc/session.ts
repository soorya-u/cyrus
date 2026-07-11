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
	// the worker authenticates with a bearer token; the browser uses its cookie
	token?: string;
};

// Bun's WebSocket accepts a headers option; the browser's does not, so this is
// only used when `headers` are supplied (the CLI worker).
function webSocketWithHeaders(headers: Record<string, string>) {
	return class extends WebSocket {
		constructor(url: string | URL, protocols?: string | string[]) {
			super(url, { headers, protocols } as unknown as string[]);
		}
	};
}

export type SignalingSession = {
	socket: PartySocket;
	signaling: SignalingClient;
	events: SignalingEvents;
	close(): void;
};

export function normalizeHost(host: string): {
	host: string;
	protocol: "ws" | "wss";
} {
	if (host.includes("://")) {
		const url = new URL(host);
		return {
			host: url.host,
			protocol:
				url.protocol === "https:" || url.protocol === "wss:" ? "wss" : "ws",
		};
	}
	return { host, protocol: "ws" };
}

async function waitForPartySocketOpen(
	socket: PartySocket,
	timeoutMs = 30_000
): Promise<void> {
	if (socket.readyState === WebSocket.OPEN) return;

	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error("WebSocket open timeout"));
		}, timeoutMs);

		const onOpen = () => {
			cleanup();
			resolve();
		};
		const onClose = () => {
			cleanup();
			reject(new Error("WebSocket closed before open"));
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
): Promise<SignalingSession> {
	const { host, protocol } = normalizeHost(options.host);

	const headers = options.token
		? { Authorization: `Bearer ${options.token}` }
		: undefined;

	const socket = new PartySocket({
		host,
		protocol,
		prefix: "ws",
		party: "hub",
		room: options.room,
		id: options.id,
		...(headers && {
			WebSocket: webSocketWithHeaders(headers) as typeof WebSocket,
		}),
	});

	const link = new RPCLink({ websocket: socket as unknown as WebSocket });
	const signaling: SignalingClient = createORPCClient(link);

	await waitForPartySocketOpen(socket);

	const result = await Result.tryPromise(async () => {
		const stream = await signaling.onSignalingEvent({
			name: options.name,
			role: options.role,
		});
		return createSignalingEvents(stream);
	});
	const events = result.tapError(() => socket.close()).unwrap();

	return {
		socket,
		signaling,
		events,
		close() {
			events.close();
			socket.close();
		},
	};
}
