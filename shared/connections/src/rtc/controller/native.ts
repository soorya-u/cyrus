import { RTCPeerConnection as NativeRTCPeerConnection } from "react-native-webrtc";
import type { ControllerContract } from "../../contracts/controller";
import { type DialOptions, dial, type RtcConnection } from "../dial";

export type NativeControllerOptions = Omit<
	DialOptions,
	"createPeerConnection" | "label"
>;

export function connectControllerNative(
	options: NativeControllerOptions
): Promise<RtcConnection<ControllerContract>> {
	return dial<ControllerContract>({
		...options,
		label: "controller",
		// spec-compatible at runtime, but react-native-webrtc ships narrower types
		createPeerConnection: (config) =>
			new NativeRTCPeerConnection(
				config as ConstructorParameters<typeof NativeRTCPeerConnection>[0]
			) as unknown as RTCPeerConnection,
	});
}
