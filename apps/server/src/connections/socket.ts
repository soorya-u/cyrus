import { broadcastSignalingEvent, router } from "@cyrus/connections/ws/server";
import { onError } from "@orpc/server";
import { HibernationPlugin } from "@orpc/server/hibernation";
import { RPCHandler } from "@orpc/server/websocket";
import { log } from "evlog";
import { type Connection, Server, type WSMessage } from "partyserver";

const handler = new RPCHandler(router, {
	interceptors: [
		onError((error) => log.error({ action: "socket-rpc-error", error })),
	],
	plugins: [new HibernationPlugin()],
});

export class Hub extends Server {
	async onMessage(connection: Connection, raw: WSMessage) {
		await handler.message(connection, raw as string | ArrayBuffer, {
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
