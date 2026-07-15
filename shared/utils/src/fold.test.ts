import { describe, expect, test } from "bun:test";
import type { AgentEvent } from "@cyrus/schemas/rtc/chat";
import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";
import { fold } from "./fold";

function entry(
	seq: number,
	turnId: string,
	event: AgentEvent,
	createdAt = `2026-07-11T00:00:${String(seq).padStart(2, "0")}.000Z`
): ConversationEntry {
	return {
		chunk: {
			event,
			seq,
			threadId: "thread-1",
			turnId,
		},
		createdAt,
		id: `entry-${seq}`,
		seq,
		threadId: "thread-1",
	};
}

function folded(entries: ConversationEntry[]) {
	const result = fold(entries);
	if (result.isErr()) throw result.error;

	return result.value;
}

describe("fold", () => {
	test("folds user and assistant events into ordered messages", () => {
		const conversation = folded([
			entry(1, "turn-1", { type: "user_message", content: "Hello" }),
			entry(2, "turn-1", { type: "token", text: "Hi " }),
			entry(3, "turn-1", { type: "token", text: "there" }),
			entry(4, "turn-1", { type: "turn_completed" }),
		]);

		expect(conversation.messages).toEqual([
			{
				content: "Hello",
				createdAt: "2026-07-11T00:00:01.000Z",
				id: "user-turn-1",
				role: "user",
				streaming: false,
				turnId: "turn-1",
			},
			{
				content: "Hi there",
				createdAt: "2026-07-11T00:00:02.000Z",
				id: "turn-1",
				role: "assistant",
				streaming: false,
				turnId: "turn-1",
			},
		]);
		expect(conversation.turns).toEqual([
			{
				completedAt: "2026-07-11T00:00:04.000Z",
				id: "turn-1",
				index: 0,
				state: "complete",
				threadId: "thread-1",
			},
		]);
	});

	test("marks the latest unfinished turn as running", () => {
		const conversation = folded([
			entry(1, "turn-1", { type: "user_message", content: "First" }),
			entry(2, "turn-1", { type: "turn_completed" }),
			entry(3, "turn-2", { type: "user_message", content: "Second" }),
			entry(4, "turn-2", { type: "token", text: "Working" }),
		]);

		expect(conversation.turns.map((turn) => turn.state)).toEqual([
			"complete",
			"running",
		]);
		expect(conversation.messages.at(-1)).toMatchObject({
			content: "Working",
			role: "assistant",
			streaming: true,
			turnId: "turn-2",
		});
	});

	test("folds thoughts, tool calls, and diffs", () => {
		const conversation = folded([
			entry(1, "turn-1", { type: "user_message", content: "Change it" }),
			entry(2, "turn-1", {
				messageId: "thought-1",
				text: "Inspecting",
				type: "thought",
			}),
			entry(3, "turn-1", {
				content: [
					{
						additions: 1,
						deletions: 1,
						newText: "new",
						oldText: "old",
						patch: "@@ -1 +1 @@",
						path: "README.md",
						type: "diff",
					},
				],
				status: "completed",
				title: "Edit README",
				toolCallId: "tool-1",
				type: "tool_call",
			}),
			entry(4, "turn-1", { type: "turn_completed" }),
		]);

		expect(conversation.thoughts).toEqual([
			{
				content: "Inspecting",
				createdAt: "2026-07-11T00:00:02.000Z",
				id: "turn-1:thought:thought-1",
				streaming: false,
				turnId: "turn-1",
			},
		]);
		expect(conversation.toolCalls).toEqual([
			expect.objectContaining({
				status: "completed",
				title: "Edit README",
				toolCallId: "tool-1",
				turnId: "turn-1",
			}),
		]);
		expect(conversation.diffs).toEqual([
			{
				additions: 1,
				deletions: 1,
				id: "turn-1:README.md",
				patch: "@@ -1 +1 @@",
				path: "README.md",
				turnId: "turn-1",
			},
		]);
	});

	test("marks interrupted turns", () => {
		const conversation = folded([
			entry(1, "turn-1", { type: "user_message", content: "Stop" }),
			entry(2, "turn-1", { type: "turn_interrupted" }),
		]);

		expect(conversation.turns[0]?.state).toBe("interrupted");
	});

	test("folds thread error events into error views", () => {
		const conversation = folded([
			entry(1, "turn-1", { type: "user_message", content: "Hello" }),
			entry(2, "turn-1", {
				type: "thread_error",
				message: "Agent crashed",
				code: "coordinator.runtime",
			}),
			entry(3, "turn-1", { type: "turn_interrupted" }),
		]);

		expect(conversation.errors).toEqual([
			{
				code: "coordinator.runtime",
				createdAt: "2026-07-11T00:00:02.000Z",
				id: "error-entry-2",
				message: "Agent crashed",
				turnId: "turn-1",
			},
		]);
		expect(conversation.turns[0]?.state).toBe("interrupted");
	});
});
