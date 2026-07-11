import { describe, expect, test } from "bun:test";
import type { ServerEvent } from "@cyrus/schemas/signaling";
import { broadcastSignalingEvent, type SignalingWS } from "./signaling";

function connection(
	id: string,
	eventId: string | null,
	sent: unknown[]
): SignalingWS {
	return {
		deserializeAttachment: <T = unknown>() =>
			(eventId ? { eventId, name: id, role: "worker" } : null) as T | null,
		id,
		send: (data) => sent.push(data),
		serializeAttachment: () => undefined,
	};
}

describe("broadcastSignalingEvent", () => {
	test("sends encoded hibernation events to peers with event iterators", () => {
		const sent: unknown[] = [];
		const event: ServerEvent = {
			id: "worker-left",
			type: "peer-left",
		};

		broadcastSignalingEvent(
			[
				connection("controller-1", "event-controller", sent),
				connection("worker-1", "event-worker", sent),
			],
			event
		);

		expect(sent).toHaveLength(2);
		expect(sent.every((payload) => typeof payload === "string")).toBe(true);
	});

	test("skips excluded peers and peers without attachments", () => {
		const sent: unknown[] = [];

		broadcastSignalingEvent(
			[
				connection("controller-1", "event-controller", sent),
				connection("worker-1", "event-worker", sent),
				connection("joining-peer", null, sent),
			],
			{
				peer: {
					id: "worker-2",
					name: "Worker 2",
					role: "worker",
				},
				type: "peer-joined",
			},
			["controller-1"]
		);

		expect(sent).toHaveLength(1);
	});
});
