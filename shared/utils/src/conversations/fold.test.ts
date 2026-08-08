import type { AgentEvent } from "@cyrus/schemas/rtc/chat";
import type { ConversationEntry } from "@cyrus/schemas/rtc/threads";
import { describe, expect, test } from "vitest";
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

function shellEntry(
	seq: number,
	shellExecutionId: string,
	event: AgentEvent,
	createdAt = `2026-07-11T00:00:${String(seq).padStart(2, "0")}.000Z`
): ConversationEntry {
	return {
		chunk: {
			event,
			seq,
			shellExecutionId,
			threadId: "thread-1",
		},
		createdAt,
		id: `entry-${seq}`,
		seq,
		threadId: "thread-1",
	};
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
				seq: 1,
				streaming: false,
				turnId: "turn-1",
			},
			{
				content: "Hi there",
				createdAt: "2026-07-11T00:00:02.000Z",
				id: "turn-1",
				role: "assistant",
				seq: 2,
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

	test("identifies the latest turn by entry position, not createdAt, when timestamps are reversed", () => {
		const conversation = folded([
			entry(
				1,
				"turn-1",
				{ type: "user_message", content: "First" },
				"2026-07-11T00:00:09.000Z"
			),
			entry(
				2,
				"turn-1",
				{ type: "turn_completed" },
				"2026-07-11T00:00:08.000Z"
			),
			entry(
				3,
				"turn-2",
				{ type: "user_message", content: "Second" },
				"2026-07-11T00:00:01.000Z"
			),
			entry(
				4,
				"turn-2",
				{ type: "token", text: "Working" },
				"2026-07-11T00:00:00.000Z"
			),
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

	test("orders turns and messages by entry position, ignoring misleading createdAt strings", () => {
		// entries always arrive pre-sorted by (seq, sub) — see
		// sortConversationEntries — so fold trusts array position for order and
		// no longer needs createdAt to reorder anything.
		const conversation = folded([
			entry(
				1,
				"turn-1",
				{ type: "user_message", content: "First" },
				"2026-07-11T00:00:09.000Z"
			),
			entry(
				2,
				"turn-1",
				{ type: "turn_completed" },
				"2026-07-11T00:00:08.000Z"
			),
			entry(
				3,
				"turn-2",
				{ type: "user_message", content: "Second" },
				"2026-07-11T00:00:07.000Z"
			),
			entry(
				4,
				"turn-2",
				{ type: "turn_completed" },
				"2026-07-11T00:00:06.000Z"
			),
		]);

		expect(conversation.turns.map((turn) => turn.id)).toEqual([
			"turn-1",
			"turn-2",
		]);
		expect(conversation.messages.map((message) => message.content)).toEqual([
			"First",
			"Second",
		]);
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
				seq: 2,
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
				diffs: [
					{
						additions: 1,
						deletions: 1,
						id: "tool-1:README.md",
						patch: "@@ -1 +1 @@",
						path: "README.md",
						toolCallId: "tool-1",
						turnId: "turn-1",
					},
				],
			}),
		]);
	});

	test("replaces a tool call's diffs wholesale on update, doesn't merge", () => {
		const conversation = folded([
			entry(1, "turn-1", { type: "user_message", content: "Change it" }),
			entry(2, "turn-1", {
				content: [
					{
						additions: 1,
						deletions: 0,
						newText: "a",
						oldText: "",
						patch: "@@ -0,0 +1 @@",
						path: "a.ts",
						type: "diff",
					},
					{
						additions: 1,
						deletions: 0,
						newText: "b",
						oldText: "",
						patch: "@@ -0,0 +1 @@",
						path: "b.ts",
						type: "diff",
					},
				],
				status: "in_progress",
				title: "Edit files",
				toolCallId: "tool-1",
				type: "tool_call",
			}),
			entry(3, "turn-1", {
				content: [
					{
						additions: 1,
						deletions: 0,
						newText: "a",
						oldText: "",
						patch: "@@ -0,0 +1 @@",
						path: "a.ts",
						type: "diff",
					},
				],
				status: "completed",
				toolCallId: "tool-1",
				type: "tool_call_update",
			}),
			entry(4, "turn-1", {
				status: "completed",
				toolCallId: "tool-1",
				type: "tool_call_update",
			}),
			entry(5, "turn-1", { type: "turn_completed" }),
		]);

		const toolCall = conversation.toolCalls[0];
		// The 3rd entry replaced the initial two-diff set with just a.ts; the 4th
		// entry (a status-only update with no content) must not clear that.
		expect(toolCall?.diffs.map((diff) => diff.path)).toEqual(["a.ts"]);
		expect(toolCall?.status).toBe("completed");
	});

	test("folds approval and elicitation requests", () => {
		const conversation = folded([
			entry(1, "turn-1", { type: "user_message", content: "Edit" }),
			entry(2, "turn-1", {
				type: "approval_request",
				request: {
					sessionId: "session-1",
					toolCall: {
						toolCallId: "tool-1",
						title: "Write file",
					},
					options: [
						{ optionId: "allow-once", name: "Allow", kind: "allow_once" },
						{ optionId: "reject-once", name: "Reject", kind: "reject_once" },
					],
				},
			}),
			entry(3, "turn-1", {
				type: "elicitation_request",
				sessionId: "session-1",
				request: {
					mode: "url",
					elicitationId: "elicit-1",
					url: "https://example.com/auth",
					message: "Open to continue",
				},
			}),
			entry(4, "turn-1", { type: "turn_completed" }),
		]);

		expect(conversation.approvals).toEqual([
			expect.objectContaining({
				toolCallId: "tool-1",
				title: "Write file",
				turnId: "turn-1",
				resolved: true,
			}),
		]);
		expect(conversation.elicitations).toEqual([
			expect.objectContaining({
				elicitationId: "elicit-1",
				mode: "url",
				url: "https://example.com/auth",
				turnId: "turn-1",
				resolved: true,
			}),
		]);
	});

	test("marks approvals resolved on approval_resolved", () => {
		const conversation = folded([
			entry(1, "turn-1", { type: "user_message", content: "Edit" }),
			entry(2, "turn-1", {
				type: "approval_request",
				request: {
					sessionId: "session-1",
					toolCall: {
						toolCallId: "tool-1",
						title: "Write file",
					},
					options: [
						{ optionId: "allow-once", name: "Allow", kind: "allow_once" },
					],
				},
			}),
			entry(3, "turn-1", {
				type: "approval_resolved",
				toolCallId: "tool-1",
				optionId: "allow-once",
			}),
		]);

		expect(conversation.approvals).toEqual([
			expect.objectContaining({
				toolCallId: "tool-1",
				resolved: true,
			}),
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
				seq: 2,
				turnId: "turn-1",
			},
		]);
		expect(conversation.turns[0]?.state).toBe("interrupted");
	});

	test("folds a shell execution without creating a fake turn", () => {
		const conversation = folded([
			entry(1, "turn-1", { type: "user_message", content: "Hello" }),
			shellEntry(2, "shell-1", {
				type: "shell_execution_start",
				command: "ls -la",
			}),
			shellEntry(3, "shell-1", {
				type: "shell_execution_end",
				status: "exited",
				exitCode: 0,
				lines: [{ stream: "stdout", text: "README.md" }],
			}),
		]);

		expect(conversation.turns.map((turn) => turn.id)).toEqual(["turn-1"]);
		expect(conversation.shellExecutions).toEqual([
			{
				command: "ls -la",
				completedAt: "2026-07-11T00:00:03.000Z",
				exitCode: 0,
				id: "shell-1",
				lines: [{ stream: "stdout", text: "README.md" }],
				seq: 2,
				startedAt: "2026-07-11T00:00:02.000Z",
				status: "exited",
				sub: undefined,
				threadId: "thread-1",
			},
		]);
	});

	test("keeps a shell execution's original seq position when it finishes", () => {
		const conversation = folded([
			shellEntry(1, "shell-1", {
				type: "shell_execution_start",
				command: "sleep 1",
			}),
			shellEntry(5, "shell-1", {
				type: "shell_execution_end",
				status: "exited",
				exitCode: 0,
				lines: [],
			}),
		]);

		expect(conversation.shellExecutions[0]?.seq).toBe(1);
	});

	test("accumulates ephemeral shell_execution_line entries while running", () => {
		const conversation = folded([
			shellEntry(1, "shell-1", {
				type: "shell_execution_start",
				command: "bun run build",
			}),
			shellEntry(1, "shell-1", {
				type: "shell_execution_line",
				lines: [{ stream: "stdout", text: "building..." }],
			}),
			shellEntry(1, "shell-1", {
				type: "shell_execution_line",
				lines: [{ stream: "stderr", text: "warning: slow" }],
			}),
		]);

		expect(conversation.shellExecutions[0]).toMatchObject({
			lines: [
				{ stream: "stdout", text: "building..." },
				{ stream: "stderr", text: "warning: slow" },
			],
			status: "running",
		});
	});

	test("reports a cancelled shell execution's status and partial output", () => {
		const conversation = folded([
			shellEntry(1, "shell-1", {
				type: "shell_execution_start",
				command: "sleep 100",
			}),
			shellEntry(2, "shell-1", {
				type: "shell_execution_end",
				status: "cancelled",
				exitCode: null,
				lines: [{ stream: "stdout", text: "partial" }],
			}),
		]);

		expect(conversation.shellExecutions[0]).toMatchObject({
			exitCode: null,
			lines: [{ stream: "stdout", text: "partial" }],
			status: "cancelled",
		});
	});
});
