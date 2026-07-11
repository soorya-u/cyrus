import { describe, expect, test } from "bun:test";
import type { AgentEvent } from "@cyrus/schemas/rtc/chat";
import { isStreamingDelta, resolvePersistEvent, trackDelta } from "./streams";

describe("stream helpers", () => {
	test("tracks streaming deltas by message id", () => {
		const messageBuffers = new Map<string, string>();
		const thoughtBuffers = new Map<string, string>();

		trackDelta(
			{ type: "token", text: "Hel", messageId: "m1" },
			messageBuffers,
			thoughtBuffers
		);
		trackDelta(
			{ type: "token", text: "lo", messageId: "m1" },
			messageBuffers,
			thoughtBuffers
		);

		expect(messageBuffers.get("m1")).toBe("Hello");
		expect(isStreamingDelta({ type: "thought", text: "x" })).toBe(true);
		expect(isStreamingDelta({ type: "turn_completed" })).toBe(false);
	});

	test("resolves completed messages from buffered deltas", () => {
		const messageBuffers = new Map<string, string>([["m1", "Hello"]]);
		const thoughtBuffers = new Map<string, string>();

		const event: AgentEvent = {
			type: "message_completed",
			text: "",
			messageId: "m1",
		};

		expect(resolvePersistEvent(event, messageBuffers, thoughtBuffers)).toEqual({
			type: "message_completed",
			text: "Hello",
			messageId: "m1",
		});
		expect(messageBuffers.has("m1")).toBe(false);
	});
});
