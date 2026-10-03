import { signalingContract } from "@cyrus/connections/contracts/signaling";
import {
	MIN_PEER_VERSION,
	meetsMinimumVersion,
} from "@cyrus/constants/version";
import {
	type ConnectionUpgradeRequiredError,
	UPGRADE_REQUIRED_CODE,
	upgradeRequiredError,
} from "@cyrus/errors/connection";
import type {
	DeviceInfo,
	DeviceRole,
	DeviceState,
	ServerEvent,
} from "@cyrus/schemas/signaling";
import { implement, ORPCError, onError } from "@orpc/server";
import {
	encodeHibernationRPCEvent,
	HibernationEventIterator,
	HibernationPlugin,
} from "@orpc/server/hibernation";
import { RPCHandler } from "@orpc/server/websocket";
import { Result } from "better-result";
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

/** Admit a peer only if its declared version meets the minimum for its role. */
export function checkPeerVersion(
	state: DeviceState,
	minimums: Record<DeviceRole, string> = MIN_PEER_VERSION
): Result<void, ConnectionUpgradeRequiredError> {
	const minimum = minimums[state.role];
	if (meetsMinimumVersion(state.version, minimum)) return Result.ok();
	return Result.err(upgradeRequiredError(state.role, state.version, minimum));
}

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
	for (const conn of connections)
		if (!excludeIds.includes(conn.id)) pushEvent(conn, event);
}

const router = {
	offer: os.offer.handler(({ input, context }) => {
		const target = [...context.server.getConnections()].find(
			(c) => c.id === input.to
		);
		if (!target)
			throw new ORPCError("NOT_FOUND", { message: "peer not connected" });

		pushEvent(target, {
			type: "offer",
			from: context.ws.id,
			offer: input.offer,
		});
	}),

	answer: os.answer.handler(({ input, context }) => {
		const target = [...context.server.getConnections()].find(
			(c) => c.id === input.to
		);
		if (!target)
			throw new ORPCError("NOT_FOUND", { message: "peer not connected" });

		pushEvent(target, {
			type: "answer",
			from: context.ws.id,
			answer: input.answer,
		});
	}),

	iceCandidate: os.iceCandidate.handler(({ input, context }) => {
		const target = [...context.server.getConnections()].find(
			(c) => c.id === input.to
		);
		if (!target)
			throw new ORPCError("NOT_FOUND", { message: "peer not connected" });

		pushEvent(target, {
			type: "ice-candidate",
			from: context.ws.id,
			candidate: input.candidate,
		});
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
					{
						id: c.id,
						name: att.name,
						role: att.role,
						version: att.version,
					} satisfies DeviceInfo,
				];
			})
	),

	onSignalingEvent: os.onSignalingEvent.handler(({ input, context }) => {
		const version = checkPeerVersion(input);
		if (version.isErr()) {
			const { role, declared, minimum, message } = version.error;
			throw new ORPCError(UPGRADE_REQUIRED_CODE, {
				data: { declared, minimum, role },
				message,
				status: 426,
			});
		}

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
