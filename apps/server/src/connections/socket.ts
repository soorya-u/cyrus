import { Result } from "better-result";
import { log } from "evlog";
import {
	type Connection,
	type ConnectionContext,
	Server,
	type WSMessage,
} from "partyserver";
import {
	type ClientMessage,
	ClientMessageSchema,
	type DeviceInfo,
	type DeviceState,
	DeviceStateSchema,
} from "../schema/socket";

export class Room extends Server {
	async onConnect(connection: Connection, ctx: ConnectionContext) {
		const url = new URL(ctx.request.url);
		const params = Object.fromEntries(url.searchParams);
		const parsed = await DeviceStateSchema.safeParseAsync(params);

		if (!parsed.success) {
			log.error({
				action: "socket-connect-invalid-params",
				error: parsed.error,
			});
			connection.close(1008, "Invalid device params");
			return;
		}

		connection.setState(parsed.data satisfies DeviceState);

		const self: DeviceInfo = { connectionId: connection.id, ...parsed.data };

		this.broadcast(JSON.stringify({ type: "peer-joined", peer: self }), [
			connection.id,
		]);

		const peersPromise = [...this.getConnections()]
			.filter((c) => c.id !== connection.id)
			.map(async (c) => {
				const result = await DeviceStateSchema.safeParseAsync(c.state);
				if (result.error) {
					log.error({
						action: "socket-peer-invalid",
						error: result.error,
						connectionId: c.id,
					});
				}

				return result.success
					? { ...result.data, connectionId: c.id }
					: undefined;
			});

		const peers = await Promise.all(peersPromise);

		connection.send(
			JSON.stringify({
				type: "room-peers",
				peers: peers.filter(Boolean) as DeviceInfo[],
			})
		);
	}

	async onMessage(sender: Connection, raw: WSMessage) {
		if (typeof raw !== "string") {
			return log.error({
				action: "socket-message-invalid-type",
				connectionId: sender.id,
			});
		}

		const jsonResult = Result.try(() => JSON.parse(raw));
		if (jsonResult.isErr()) {
			return log.error({
				action: "socket-message-invalid",
				error: jsonResult.error,
				connectionId: sender.id,
			});
		}

		const parsed = await ClientMessageSchema.safeParseAsync(
			jsonResult.unwrap()
		);
		if (!parsed.success) {
			return log.error({
				action: "socket-message-invalid",
				error: parsed.error,
				connectionId: sender.id,
			});
		}

		const msg: ClientMessage = parsed.data;

		// WebRTC signaling — find the target connection and relay
		const target = [...this.getConnections()].find((c) => c.id === msg.to);
		if (!target) {
			return log.error({
				action: "socket-message-target-not-found",
				connectionId: sender.id,
				to: msg.to,
			});
		}

		switch (msg.type) {
			case "offer":
				target.send(
					JSON.stringify({
						type: "offer",
						from: sender.id,
						offer: msg.offer,
					})
				);
				break;
			case "answer":
				target.send(
					JSON.stringify({
						type: "answer",
						from: sender.id,
						answer: msg.answer,
					})
				);
				break;
			case "ice-candidate":
				target.send(
					JSON.stringify({
						type: "ice-candidate",
						from: sender.id,
						candidate: msg.candidate,
					})
				);
				break;
			default:
				break;
		}
	}

	onClose(connection: Connection) {
		this.broadcast(
			JSON.stringify({ type: "peer-left", connectionId: connection.id })
		);
	}

	onError(connection: Connection, error: Error) {
		log.error({ action: "socket-error", connectionId: connection.id, error });
	}
}
