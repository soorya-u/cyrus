import type { ConnectionError } from "@cyrus/errors/connection";
import {
	connectionErrorMessageFromUnknown,
	dialFailedError,
} from "@cyrus/errors/connection";
import type { DeviceRole } from "@cyrus/schemas/signaling";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { AnyContractRouter, ContractRouterClient } from "@orpc/contract";
import { Result } from "better-result";
import {
	createIceBuffer,
	mapUnknownToDialError,
	relayLocalIce,
	type SignalingClient,
	type SignalingEvents,
	whenOpen,
} from "./peer";
import { asWebSocket } from "./socket";

export type CreatePeerConnection = (
	config?: RTCConfiguration
) => RTCPeerConnection;

export type DialOptions = {
	createPeerConnection: CreatePeerConnection;
	signaling: SignalingClient;
	events: SignalingEvents;
	to: string;
	label: DeviceRole;
	config?: RTCConfiguration;
};

export type RtcConnection<TContract extends AnyContractRouter> = {
	/** Typed oRPC client derived from the worker's contract. */
	client: ContractRouterClient<TContract>;
	peer: RTCPeerConnection;
	channel: RTCDataChannel;
	close(): void;
};

export async function dial<TContract extends AnyContractRouter>(
	options: DialOptions
): Promise<Result<RtcConnection<TContract>, ConnectionError>> {
	const { createPeerConnection, signaling, events, to, label, config } =
		options;

	const pc = createPeerConnection(config);
	const ice = createIceBuffer(pc);
	relayLocalIce(pc, signaling, to);

	const channel = pc.createDataChannel(label);

	let rejectDial: ((err: ConnectionError) => void) | null = null;
	const failSignal = new Promise<Result<never, ConnectionError>>((resolve) => {
		rejectDial = (err) => resolve(Result.err(err));
	});

	const unsubscribe = events.subscribe((event) => {
		if (event.type === "answer" && event.from === to) {
			ice.setRemote(event.answer).then((result) => {
				if (result.isOk()) return;
				unsubscribe();
				channel.close();
				pc.close();
				rejectDial?.(result.error);
			});
		} else if (event.type === "ice-candidate" && event.from === to) {
			ice.addRemote(event.candidate).then((result) => {
				if (result.isOk()) return;
				unsubscribe();
				channel.close();
				pc.close();
				rejectDial?.(result.error);
			});
		}
	});

	const offerResult = await Result.tryPromise({
		try: async () => {
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			await signaling.offer({ to, offer });
		},
		catch: (error) =>
			dialFailedError(
				"Failed to create RTC offer",
				connectionErrorMessageFromUnknown(error)
			),
	});
	if (offerResult.isErr()) {
		unsubscribe();
		channel.close();
		pc.close();
		return Result.err(offerResult.error);
	}

	const openResult = await Promise.race([whenOpen(channel), failSignal]);
	if (openResult.isErr()) {
		unsubscribe();
		channel.close();
		pc.close();
		return Result.err(mapUnknownToDialError(openResult.error));
	}

	const link = new RPCLink({ websocket: asWebSocket(channel) });
	const client: ContractRouterClient<TContract> = createORPCClient(link);

	return Result.ok({
		client,
		peer: pc,
		channel,
		close() {
			unsubscribe();
			channel.close();
			pc.close();
		},
	});
}
