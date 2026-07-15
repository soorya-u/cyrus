import { describe, expect, test } from "bun:test";
import {
	AgentEventSchema,
	ChatChunkSchema,
	ChatInputSchema,
	ToolCallContentSchema,
} from "./chat";

describe("chat schemas", () => {
	test("parses a valid chat request", () => {
		expect(
			ChatInputSchema.parse({
				agentName: "claude",
				message: [{ type: "text", text: "hello" }],
				projectId: "project-1",
				threadId: "00000000-0000-4000-8000-000000000001",
				turnId: "00000000-0000-4000-8000-000000000002",
			})
		).toMatchObject({
			agentName: "claude",
			message: [{ type: "text", text: "hello" }],
			projectId: "project-1",
		});
	});

	test("rejects plain string messages", () => {
		expect(() =>
			ChatInputSchema.parse({
				agentName: "claude",
				message: "hello",
				projectId: "project-1",
			})
		).toThrow();
	});

	test("parses structured prompt blocks", () => {
		expect(
			ChatInputSchema.parse({
				agentName: "claude",
				message: [
					{ type: "text", text: "review" },
					{ type: "resource", uri: "src/index.ts", name: "index.ts" },
				],
				projectId: "project-1",
			})
		).toMatchObject({
			message: [
				{ type: "text", text: "review" },
				{ type: "resource", uri: "src/index.ts", name: "index.ts" },
			],
		});
	});

	test("rejects non-uuid optional chat identifiers", () => {
		expect(() =>
			ChatInputSchema.parse({
				agentName: "claude",
				message: [{ type: "text", text: "hello" }],
				projectId: "project-1",
				threadId: "not-a-uuid",
			})
		).toThrow();
	});

	test("parses representative agent events", () => {
		expect(
			AgentEventSchema.parse({
				type: "tool_call",
				toolCallId: "tool-1",
				title: "Read file",
				kind: "read",
				status: "in_progress",
				content: [
					{
						type: "content",
						content: { type: "text", text: "reading package.json" },
					},
				],
			})
		).toMatchObject({
			type: "tool_call",
			toolCallId: "tool-1",
			kind: "read",
		});

		expect(
			AgentEventSchema.parse({
				type: "plan_update",
				plan: {
					type: "items",
					id: "plan-1",
					entries: [
						{
							content: "Write schema tests",
							priority: "high",
							status: "completed",
						},
					],
				},
			})
		).toMatchObject({ type: "plan_update" });
	});

	test("parses chat chunks with nested events", () => {
		expect(
			ChatChunkSchema.parse({
				threadId: "thread-1",
				turnId: "turn-1",
				seq: 1,
				event: { type: "token", text: "hello", messageId: "message-1" },
			})
		).toEqual({
			threadId: "thread-1",
			turnId: "turn-1",
			seq: 1,
			event: { type: "token", text: "hello", messageId: "message-1" },
		});
	});

	test("rejects unknown tool content types", () => {
		expect(() =>
			ToolCallContentSchema.parse({
				type: "unknown",
				content: { type: "text", text: "nope" },
			})
		).toThrow();
	});
});
