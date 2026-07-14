import { log } from "evlog";
import { type Connection, Server, type WSMessage } from "partyserver";
import { WS_BASE_PROTOCOL } from "../auth/ws";
import {
	broadcastSignalingEvent,
	signalingHandler,
} from "../handlers/signaling";

const WS_PROTOCOL_HEADER = "Sec-WebSocket-Protocol";

export class Hub extends Server {
	override async fetch(request: Request): Promise<Response> {
		const response = await super.fetch(request);
		if (response.status !== 101 || !response.webSocket) return response;

		return new Response(null, {
			status: 101,
			webSocket: response.webSocket,
			headers: {
				[WS_PROTOCOL_HEADER]: WS_BASE_PROTOCOL,
			},
		});
	}

	async onMessage(connection: Connection, raw: WSMessage) {
		await signalingHandler.message(connection, raw as string | ArrayBuffer, {
			context: { server: this, ws: connection },
		});
	}

	onClose(connection: Connection) {
		broadcastSignalingEvent(
			this.getConnections(),
			{ type: "peer-left", id: connection.id },
			[connection.id]
		);
	}

	onError(connection: Connection, error: Error) {
		log.error({ action: "socket-error", connectionId: connection.id, error });
	}
}
