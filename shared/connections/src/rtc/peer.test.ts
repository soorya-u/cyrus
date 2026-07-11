import { describe, expect, test } from "bun:test";
import type { ServerEvent } from "@cyrus/schemas/signaling";
import { createSignalingEvents } from "./peer";

function* eventStream(events: ServerEvent[]) {
	for (const event of events) yield event;
}

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
		await Bun.sleep(10);
		events.close();

		expect(received).toEqual([
			{ type: "peer-left", id: "peer-1" },
			{ type: "peer-left", id: "peer-2" },
		]);
	});

	test("stops delivering after close", async () => {
		const stream = eventStream([{ type: "peer-left", id: "peer-1" }]);
		const events = createSignalingEvents(stream);
		const received: ServerEvent[] = [];

		events.subscribe((event) => received.push(event));
		events.close();
		await Bun.sleep(10);

		expect(received).toHaveLength(0);
	});
});
