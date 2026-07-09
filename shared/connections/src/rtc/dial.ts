import type { DeviceRole } from "@cyrus/schemas/signaling";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { AnyContractRouter, ContractRouterClient } from "@orpc/contract";
import {
	createIceBuffer,
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
): Promise<RtcConnection<TContract>> {
	const { createPeerConnection, signaling, events, to, label, config } =
		options;

	const pc = createPeerConnection(config);
	const ice = createIceBuffer(pc);
	relayLocalIce(pc, signaling, to);

	const channel = pc.createDataChannel(label);

	let rejectDial: ((err: unknown) => void) | null = null;
	const failSignal = new Promise<never>((_, reject) => {
		rejectDial = reject;
	});

	const unsubscribe = events.subscribe((event) => {
		if (event.type === "answer" && event.from === to) {
			ice.setRemote(event.answer).catch((err) => {
				unsubscribe();
				channel.close();
				pc.close();
				rejectDial?.(err);
			});
		} else if (event.type === "ice-candidate" && event.from === to) {
			ice.addRemote(event.candidate);
		}
	});

	const offer = await pc.createOffer();
	await pc.setLocalDescription(offer);
	await signaling.offer({ to, offer });

	await Promise.race([whenOpen(channel), failSignal]);

	const link = new RPCLink({ websocket: asWebSocket(channel) });
	const client: ContractRouterClient<TContract> = createORPCClient(link);

	return {
		client,
		peer: pc,
		channel,
		close() {
			unsubscribe();
			channel.close();
			pc.close();
		},
	};
}
