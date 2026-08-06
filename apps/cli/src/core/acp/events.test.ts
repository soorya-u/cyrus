import { describe, expect, test } from "bun:test";
import { mapApprovalRequest, mapRuntimeSessionEvent } from "./events";

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

describe("mapApprovalRequest", () => {
	test("does not throw on a raw ACP diff content item without patch/additions/deletions", () => {
		const event = mapApprovalRequest({
			sessionId: "session-1",
			toolCallId: "tool-1",
			toolName: "edit",
			title: "Edit file.txt",
			input: {},
			options: [
				{ optionId: "reject", name: "Deny", kind: "reject_once" },
				{ optionId: "allow", name: "Allow Once", kind: "allow_once" },
			],
			raw: {
				sessionId: "session-1",
				toolCall: {
					toolCallId: "tool-1",
					title: "Edit file.txt",
					kind: "edit",
					content: [
						{
							type: "diff",
							path: "/tmp/file.txt",
							oldText: "old\n",
							newText: "new\n",
						},
					],
				},
			},
		} as never);

		expect(event).toMatchObject({
			type: "approval_request",
			request: {
				toolCall: {
					toolCallId: "tool-1",
					content: [
						expect.objectContaining({
							type: "diff",
							path: "/tmp/file.txt",
							additions: expect.any(Number),
							deletions: expect.any(Number),
							patch: expect.any(String),
						}),
					],
				},
			},
		});
	});
});
