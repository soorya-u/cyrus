import { Result } from "better-result";

const READY_STATE = {
	connecting: WebSocket.CONNECTING,
	open: WebSocket.OPEN,
	closing: WebSocket.CLOSING,
	closed: WebSocket.CLOSED,
} as const satisfies Record<RTCDataChannelState, number>;

export type ChannelSocket = Pick<
	WebSocket,
	"addEventListener" | "removeEventListener" | "send" | "readyState"
>;

export function asWebSocket(channel: RTCDataChannel): ChannelSocket {
	channel.binaryType = "arraybuffer";
	return {
		get readyState() {
			return READY_STATE[channel.readyState];
		},
		send: (data) => Result.try(() => channel.send(data as ArrayBuffer)),
		addEventListener: channel.addEventListener.bind(channel),
		removeEventListener: channel.removeEventListener.bind(channel),
	};
}
