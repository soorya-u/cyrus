import type { ServerEvent } from "@cyrus/schemas/signaling";
import { describe, expect, test } from "vitest";
import { createSignalingEvents } from "./peer";

async function* eventStream(events: ServerEvent[]) {
	for (const event of events) {
		await Promise.resolve();
		yield event;
	}
}

const flushMicrotasks = () =>
	new Promise<void>((resolve) => setImmediate(resolve));

describe("createSignalingEvents", () => {
	test("fans out events to subscribers", async () => {
		const events = createSignalingEvents(
			eventStream([
				{ type: "peer-left", id: "peer-1" },
				{ type: "peer-left", id: "peer-2" },
			])
		);
		const received: ServerEvent[] = [];

		events.subscribe((event) => received.push(event));
		await flushMicrotasks();
		events.close();

		expect(received).toEqual([
			{ type: "peer-left", id: "peer-1" },
			{ type: "peer-left", id: "peer-2" },
		]);
	});

	test("stops delivering after close", () => {
		const stream = eventStream([{ type: "peer-left", id: "peer-1" }]);
		const events = createSignalingEvents(stream);
		const received: ServerEvent[] = [];

		events.subscribe((event) => received.push(event));
		events.close();

		expect(received).toHaveLength(0);
	});
});
