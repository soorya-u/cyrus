import { signalingContract } from "@cyrus/connections/contracts/signaling";
import type {
	DeviceInfo,
	DeviceState,
	ServerEvent,
} from "@cyrus/connections/schemas/signaling";
import { implement, ORPCError, onError } from "@orpc/server";
import {
	encodeHibernationRPCEvent,
	HibernationEventIterator,
	HibernationPlugin,
} from "@orpc/server/hibernation";
import { RPCHandler } from "@orpc/server/websocket";
import { log } from "evlog";

export type SignalingWS = {
	deserializeAttachment<T = unknown>(): T | null;
	readonly id: string;
	send(data: string | ArrayBuffer): void;
	serializeAttachment<T = unknown>(attachment: T): void;
};

export type SignalingHub = {
	getConnections(): Iterable<SignalingWS>;
};

export type SignalingContext = {
	server: SignalingHub;
	ws: SignalingWS;
};

const os = implement(signalingContract).$context<SignalingContext>();

// stashed per connection: the hibernation event-iterator id plus declared metadata
type Attachment = { eventId: string } & DeviceState;

function pushEvent(ws: SignalingWS, event: ServerEvent): void {
	const att = ws.deserializeAttachment<Attachment | null>();
	if (att?.eventId) {
		ws.send(encodeHibernationRPCEvent(att.eventId, event));
	}
}

export function broadcastSignalingEvent(
	connections: Iterable<SignalingWS>,
	event: ServerEvent,
	excludeIds: string[] = []
): void {
	for (const conn of connections) {
		if (!excludeIds.includes(conn.id)) {
			pushEvent(conn, event);
		}
	}
}

const router = {
	offer: os.offer.handler(({ input, context }) => {
		const target = [...context.server.getConnections()].find(
			(c) => c.id === input.to
		);
		if (target) {
			pushEvent(target, {
				type: "offer",
				from: context.ws.id,
				offer: input.offer,
			});
		}
	}),

	answer: os.answer.handler(({ input, context }) => {
		const target = [...context.server.getConnections()].find(
			(c) => c.id === input.to
		);
		if (target) {
			pushEvent(target, {
				type: "answer",
				from: context.ws.id,
				answer: input.answer,
			});
		}
	}),

	iceCandidate: os.iceCandidate.handler(({ input, context }) => {
		const target = [...context.server.getConnections()].find(
			(c) => c.id === input.to
		);
		if (target) {
			pushEvent(target, {
				type: "ice-candidate",
				from: context.ws.id,
				candidate: input.candidate,
			});
		}
	}),

	listPeers: os.listPeers.handler(({ context }) =>
		[...context.server.getConnections()]
			.filter((c) => c.id !== context.ws.id)
			.flatMap((c) => {
				const att = c.deserializeAttachment<Attachment | null>();
				if (!att?.name) {
					return [];
				}
				return [
					{ id: c.id, name: att.name, role: att.role } satisfies DeviceInfo,
				];
			})
	),

	onSignalingEvent: os.onSignalingEvent.handler(({ input, context }) => {
		// names must be unique across the room; a same-id match is the device reconnecting
		const nameTaken = [...context.server.getConnections()].some((c) => {
			if (c.id === context.ws.id) {
				return false;
			}
			return c.deserializeAttachment<Attachment | null>()?.name === input.name;
		});
		if (nameTaken) {
			throw new ORPCError("CONFLICT", {
				message: `name "${input.name}" is already in use`,
			});
		}

		return new HibernationEventIterator<ServerEvent>((eventId) => {
			context.ws.serializeAttachment({
				eventId,
				...input,
			} satisfies Attachment);

			const self: DeviceInfo = { id: context.ws.id, ...input };
			broadcastSignalingEvent(
				context.server.getConnections(),
				{ type: "peer-joined", peer: self },
				[context.ws.id]
			);
		});
	}),
};

export const signalingHandler = new RPCHandler(router, {
	interceptors: [
		onError((error) => log.error({ action: "socket-rpc-error", error })),
	],
	plugins: [new HibernationPlugin()],
});
