import type { ControllerContract } from "@cyrus/connections/contracts/controller";
import { dial, type RtcConnection } from "@cyrus/connections/rtc/dial";
import type { SignalingSession } from "@cyrus/connections/rtc/session";
import { RTCPeerConnection as NodeRTCPeerConnection } from "node-datachannel/polyfill";

export async function connectE2eControllerRtc(
	session: SignalingSession,
	workerId: string
): Promise<RtcConnection<ControllerContract>> {
	const peers = await session.signaling.listPeers();
	const worker = peers.find((peer) => peer.id === workerId);
	if (!worker) {
		throw new Error(`worker "${workerId}" not found in signaling peers`);
	}

	return dial<ControllerContract>({
		signaling: session.signaling,
		events: session.events,
		to: workerId,
		label: "controller",
		createPeerConnection: (config) =>
			new NodeRTCPeerConnection(
				config as ConstructorParameters<typeof NodeRTCPeerConnection>[0]
			) as unknown as RTCPeerConnection,
	});
}
