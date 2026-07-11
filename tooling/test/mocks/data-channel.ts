import { describe, expect, test } from "bun:test";

type MockChannel = {
	readyState: RTCDataChannelState;
	listeners: Map<string, Set<EventListener>>;
};

export function createMockDataChannel(
	initialState: RTCDataChannelState = "connecting"
): MockChannel {
	return {
		readyState: initialState,
		listeners: new Map(),
	};
}

export function openMockDataChannel(channel: MockChannel): void {
	channel.readyState = "open";
	for (const listener of channel.listeners.get("open") ?? []) {
		listener(new Event("open"));
	}
}

export function attachMockChannelListeners(
	channel: MockChannel,
	handlers: {
		onOpen?: () => void;
		onError?: () => void;
		onClose?: () => void;
	}
): void {
	const register = (type: string, handler?: () => void) => {
		if (!handler) return;
		const listeners = channel.listeners.get(type) ?? new Set();
		listeners.add(handler as EventListener);
		channel.listeners.set(type, listeners);
	};

	register("open", handlers.onOpen);
	register("error", handlers.onError);
	register("close", handlers.onClose);
}

describe("mock data channel", () => {
	test("opens and notifies listeners", () => {
		const channel = createMockDataChannel();
		let opened = false;

		attachMockChannelListeners(channel, {
			onOpen: () => {
				opened = true;
			},
		});
		openMockDataChannel(channel);

		expect(channel.readyState).toBe("open");
		expect(opened).toBe(true);
	});
});
