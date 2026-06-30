import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import { Result } from "better-result";
import { PartySocket } from "partysocket";
import type { SignalingClient } from "../contracts/signaling";
import type { DeviceRole } from "../schemas/signaling";
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

function normalizeHost(host: string): {
	host: string;
	protocol: "ws" | "wss";
} {
	if (host.includes("://")) {
		const url = new URL(host);
		return {
			host: url.host,
			protocol: url.protocol === "https:" ? "wss" : "ws",
		};
	}
	return { host, protocol: "ws" };
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
