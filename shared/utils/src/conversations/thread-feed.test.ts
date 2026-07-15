import { describe, expect, test } from "bun:test";
import { deriveFeed } from "./thread-feed";

describe("deriveFeed", () => {
	test("emits flat error feed entries from thread errors", () => {
		const feed = deriveFeed({
			approvals: [],
			diffs: [],
			elicitations: [],
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

	test("interleaves orphaned errors by createdAt", () => {
		const feed = deriveFeed({
			approvals: [],
			diffs: [],
			elicitations: [],
			errors: [
				{
					createdAt: "2026-07-11T00:00:01.500Z",
					id: "error-orphan",
					message: "Early bind failed",
					turnId: "orphan-turn",
				},
			],
			messages: [
				{
					content: "Later",
					createdAt: "2026-07-11T00:00:02.000Z",
					id: "user-turn-2",
					role: "user",
					turnId: "turn-2",
				},
			],
			thoughts: [],
			toolCalls: [],
			turns: [
				{
					completedAt: "2026-07-11T00:00:03.000Z",
					id: "turn-2",
					index: 0,
					state: "complete",
					threadId: "thread-1",
				},
			],
		});

		expect(feed.map((entry) => entry.id)).toEqual([
			"error-orphan",
			"user-turn-2",
		]);
	});

	test("emits approval and elicitation feed entries", () => {
		const feed = deriveFeed({
			approvals: [
				{
					createdAt: "2026-07-11T00:00:02.000Z",
					id: "approval-tool-1",
					options: [
						{ optionId: "allow-once", name: "Allow", kind: "allow_once" },
					],
					sessionId: "session-1",
					threadId: "thread-1",
					title: "Write file",
					toolCallId: "tool-1",
					turnId: "turn-1",
				},
			],
			diffs: [
				{
					additions: 1,
					deletions: 0,
					id: "turn-1:a.ts",
					patch: "@@ -0 +1 @@",
					path: "a.ts",
					toolCallId: "tool-1",
					turnId: "turn-1",
				},
			],
			elicitations: [
				{
					createdAt: "2026-07-11T00:00:03.000Z",
					elicitationId: "elicit-1",
					id: "elicitation-elicit-1",
					message: "Confirm",
					mode: "form",
					sessionId: "session-1",
					threadId: "thread-1",
					turnId: "turn-1",
				},
			],
			errors: [],
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
			toolCalls: [
				{
					createdAt: "2026-07-11T00:00:01.500Z",
					status: "pending",
					title: "Write file",
					toolCallId: "tool-1",
					turnId: "turn-1",
				},
			],
			turns: [
				{
					completedAt: null,
					id: "turn-1",
					index: 0,
					state: "running",
					threadId: "thread-1",
				},
			],
		});

		const tool = feed.find((entry) => entry.type === "tool");
		expect(tool).toMatchObject({
			type: "tool",
			pendingApproval: { toolCallId: "tool-1" },
		});
		const diff = feed.find((entry) => entry.type === "diff");
		expect(diff).toMatchObject({
			type: "diff",
			pendingApproval: { toolCallId: "tool-1" },
		});
		expect(feed.some((entry) => entry.type === "approval")).toBe(true);
		expect(feed.some((entry) => entry.type === "elicitation")).toBe(true);
	});
});
