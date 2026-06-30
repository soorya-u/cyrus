import type { ControllerContract } from "../../contracts/controller";
import { type DialOptions, dial, type RtcConnection } from "../dial";

export type WebControllerOptions = Omit<
	DialOptions,
	"createPeerConnection" | "label"
>;

export function connectControllerWeb(
	options: WebControllerOptions
): Promise<RtcConnection<ControllerContract>> {
	return dial<ControllerContract>({
		...options,
		label: "controller",
		createPeerConnection: (config) => new RTCPeerConnection(config),
	});
}
