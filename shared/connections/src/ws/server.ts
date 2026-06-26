import { os } from "@orpc/server";
import {
	encodeHibernationRPCEvent,
	HibernationEventIterator,
} from "@orpc/server/hibernation";
import {
	AnswerInputSchema,
	type DeviceInfo,
	DeviceStateSchema,
	IceCandidateInputSchema,
	OfferInputSchema,
	type ServerEvent,
} from "./schema";

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

const base = os.$context<SignalingContext>();

function pushEvent(ws: SignalingWS, event: ServerEvent): void {
	const att = ws.deserializeAttachment<{ id?: string }>();
	if (att?.id) {
		ws.send(encodeHibernationRPCEvent(att.id, event));
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

export const router = {
	offer: base.input(OfferInputSchema).handler(({ input, context }) => {
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

	answer: base.input(AnswerInputSchema).handler(({ input, context }) => {
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

	iceCandidate: base
		.input(IceCandidateInputSchema)
		.handler(({ input, context }) => {
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

	listPeers: base.handler(async ({ context }) =>
		[...context.server.getConnections()]
			.filter((c) => c.id !== context.ws.id)
			.flatMap((c) => {
				const att = c.deserializeAttachment<
					({ id: string } & DeviceInfo) | null
				>();
				if (!att?.deviceId) {
					return [];
				}
				return [
					{
						connectionId: c.id,
						deviceId: att.deviceId,
						name: att.name,
						role: att.role,
					} satisfies DeviceInfo,
				];
			})
	),

	onSignalingEvent: base.input(DeviceStateSchema).handler(
		async ({ input, context }) =>
			new HibernationEventIterator<ServerEvent>((id) => {
				context.ws.serializeAttachment({ id, ...input });

				const self: DeviceInfo = { connectionId: context.ws.id, ...input };
				broadcastSignalingEvent(
					context.server.getConnections(),
					{ type: "peer-joined", peer: self },
					[context.ws.id]
				);
			})
	),
};

export type SignalingRouter = typeof router;
