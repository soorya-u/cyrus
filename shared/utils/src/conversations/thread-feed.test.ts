import { describe, expect, test } from "bun:test";
import { deriveFeed } from "./thread-feed";

describe("deriveFeed", () => {
	test("emits flat error feed entries from thread errors", () => {
		const feed = deriveFeed({
			diffs: [],
			errors: [
				{
					code: "coordinator.runtime",
					createdAt: "2026-07-11T00:00:02.000Z",
					id: "error-1",
					message: "Bind failed",
					turnId: "turn-1",
				},
			],
			messages: [
				{
					content: "Hello",
					createdAt: "2026-07-11T00:00:01.000Z",
					id: "user-turn-1",
					role: "user",
					turnId: "turn-1",
				},
			],
			thoughts: [],
			toolCalls: [],
			turns: [
				{
					completedAt: "2026-07-11T00:00:03.000Z",
					id: "turn-1",
					index: 0,
					state: "interrupted",
					threadId: "thread-1",
				},
			],
		});

		expect(feed.some((entry) => entry.type === "error")).toBe(true);
		expect(feed.find((entry) => entry.type === "error")).toMatchObject({
			type: "error",
			error: {
				message: "Bind failed",
				turnId: "turn-1",
			},
		});
	});
});
