import { RTCPeerConnection as NodeRTCPeerConnection } from "node-datachannel/polyfill";
import type { WorkerContract } from "../../contracts/worker";
import { type DialOptions, dial, type RtcConnection } from "../dial";

// TODO: worker-to-worker isn't needed yet; this dialer is a stub, unused for now
export type ConnectWorkerOptions = Omit<
	DialOptions,
	"createPeerConnection" | "label"
>;

export function connectWorker(
	options: ConnectWorkerOptions
): Promise<RtcConnection<WorkerContract>> {
	return dial<WorkerContract>({
		...options,
		label: "worker",
		createPeerConnection: (config) =>
			new NodeRTCPeerConnection(config) as unknown as RTCPeerConnection,
	});
}
