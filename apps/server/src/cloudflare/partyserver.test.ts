import { env } from "cloudflare:workers";
import { describe, expect, test } from "vitest";
import { WS_BASE_PROTOCOL } from "../auth/ws";

const WS_PROTOCOL_HEADER = "Sec-WebSocket-Protocol";

describe("Hub", () => {
	test("accepts a WebSocket through its Durable Object fetch entrypoint", async () => {
		const hub = env.HUB.getByName("workers-pool-test");
		const response = await hub.fetch("https://example.com/ws/hub/test", {
			headers: {
				Upgrade: "websocket",
				[WS_PROTOCOL_HEADER]: WS_BASE_PROTOCOL,
			},
		});
		const socket = response.webSocket;

		expect(response.status).toBe(101);
		expect(response.headers.get(WS_PROTOCOL_HEADER)).toBe(WS_BASE_PROTOCOL);
		expect(socket).not.toBeNull();

		socket?.accept();
		socket?.close(1000, "test complete");
	});
});
