import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import { PartySocket } from "partysocket";
import type { SignalingClient } from "../contracts/signaling";
import { createSignalingEvents, type SignalingEvents } from "./peer";

type SignalingBase = {
	host: string;
	room: string;
	id: string;
};

export type ConnectSignalingOptions = SignalingBase &
	(
		| {
				role: "controller";
				// mobile might pass a bearer token
				token?: string;
		  }
		| {
				role: "worker";
				name: string;
				token: string;
		  }
	);

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

	// controllers have no name; the server still requires a unique one, so derive
	// it from the (unique) id
	const name =
		options.role === "worker"
			? options.name
			: `controller-${options.id.slice(0, 8)}`;

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
	const stream = await signaling.onSignalingEvent({ name, role: options.role });
	const events = createSignalingEvents(stream);

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
