import { describe, expect, test } from "bun:test";
import {
	ConversationEntrySchema,
	RenameThreadInputSchema,
	ThreadSchema,
	WatchThreadOutputSchema,
} from "./threads";

describe("thread schemas", () => {
	test("normalizes nullable agent names to undefined", () => {
		expect(
			ThreadSchema.parse({
				id: "thread-1",
				projectId: "project-1",
				name: "Main",
				agentName: null,
				createdAt: "2026-07-11T00:00:00.000Z",
				updatedAt: "2026-07-11T00:00:00.000Z",
			})
		).toEqual({
			id: "thread-1",
			projectId: "project-1",
			name: "Main",
			agentName: undefined,
			createdAt: "2026-07-11T00:00:00.000Z",
			updatedAt: "2026-07-11T00:00:00.000Z",
		});
	});

	test("rejects empty thread names for rename input", () => {
		expect(() =>
			RenameThreadInputSchema.parse({ threadId: "thread-1", name: "" })
		).toThrow();
	});

	test("parses conversation entries with chat chunks", () => {
		expect(
			ConversationEntrySchema.parse({
				id: "entry-1",
				threadId: "thread-1",
				seq: 1,
				createdAt: "2026-07-11T00:00:01.000Z",
				chunk: {
					threadId: "thread-1",
					turnId: "turn-1",
					seq: 1,
					event: { type: "user_message", content: "hello" },
				},
			})
		).toMatchObject({
			id: "entry-1",
			threadId: "thread-1",
			chunk: { event: { type: "user_message" } },
		});
	});

	test("parses watch output high water marks", () => {
		expect(
			WatchThreadOutputSchema.parse({ snapshotHighWaterMark: 42 })
		).toEqual({ snapshotHighWaterMark: 42 });
	});
});
