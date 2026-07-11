import { describe, expect, test } from "bun:test";
import { mapRuntimeSessionEvent } from "./events";

describe("mapRuntimeSessionEvent", () => {
	test("maps token deltas", () => {
		expect(
			mapRuntimeSessionEvent({
				type: "message.delta",
				delta: "hello",
				messageId: "m1",
				sessionId: "session-1",
				at: 0,
			} as never)
		).toEqual([
			{
				type: "token",
				text: "hello",
				messageId: "m1",
			},
		]);
	});

	test("maps tool start events", () => {
		expect(
			mapRuntimeSessionEvent({
				type: "tool.start",
				toolCallId: "tool-1",
				name: "read",
				title: "Read file",
				status: "running",
				content: undefined,
				input: { path: "README.md" },
			} as never)
		).toEqual([
			expect.objectContaining({
				type: "tool_call",
				toolCallId: "tool-1",
				title: "Read file",
				status: "in_progress",
			}),
		]);
	});
});
