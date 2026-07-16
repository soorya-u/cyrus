import type { ConnectionError } from "@cyrus/errors/connection";
import type { Result } from "better-result";
import { RTCPeerConnection as NativeRTCPeerConnection } from "react-native-webrtc";
import type { ControllerContract } from "../../contracts/controller";
import { type DialOptions, dial, type RtcConnection } from "../dial";

export type NativeControllerOptions = Omit<
	DialOptions,
	"createPeerConnection" | "label"
>;

export function connectControllerNative(
	options: NativeControllerOptions
): Promise<Result<RtcConnection<ControllerContract>, ConnectionError>> {
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
