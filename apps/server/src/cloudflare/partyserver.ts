import { log } from "evlog";
import { type Connection, Server, type WSMessage } from "partyserver";
import {
	broadcastSignalingEvent,
	signalingHandler,
} from "../handlers/signaling";

export class Hub extends Server {
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
