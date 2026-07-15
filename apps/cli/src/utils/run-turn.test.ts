import { describe, expect, test } from "bun:test";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { Result } from "better-result";
import { runTurn } from "./run-turn";

const textMessage = (text: string) => [{ type: "text" as const, text }];

describe("runTurn", () => {
	test("emits user, thread, streamed, and completed events", async () => {
		const emitted: ChatChunk["event"][] = [];
		const terminal: ChatChunk["event"][] = [];

		function* prompt() {
			yield { type: "token" as const, text: "done", messageId: "m1" };
		}

		const result = await runTurn({
			agentName: "claude",
			threadId: "thread-1",
			projectId: "project-1",
			message: textMessage("hello"),
			emit: (event) => {
				emitted.push(event);
				return Promise.resolve();
			},
			emitTerminal: (event) => {
				terminal.push(event);
				return Promise.resolve();
			},
			runtime: {
				threadCoordinator: {
					prompt: async () => Result.ok(prompt()),
				},
			} as never,
		});

		expect(result.isOk()).toBe(true);
		expect(emitted).toEqual([
			{
				type: "user_message",
				content: "hello",
				blocks: [{ type: "text", text: "hello" }],
			},
			{ type: "thread_started", threadId: "thread-1" },
			{ type: "token", text: "done", messageId: "m1" },
		]);
		expect(terminal).toEqual([{ type: "turn_completed" }]);
	});

	test("emits interrupted terminal event when initial emit fails", async () => {
		const terminal: ChatChunk["event"][] = [];

		const result = await runTurn({
			agentName: "claude",
			threadId: "thread-1",
			projectId: "project-1",
			message: textMessage("hello"),
			emit: () => Promise.reject(new Error("emit failed")),
			emitTerminal: (event) => {
				terminal.push(event);
				return Promise.resolve();
			},
			runtime: {
				threadCoordinator: {
					prompt: async () =>
						Result.ok(
							(function* unusedPrompt() {
								yield { type: "token" as const, text: "", messageId: "m1" };
							})()
						),
				},
			} as never,
		});

		expect(result.isErr()).toBe(true);
		expect(terminal).toEqual([{ type: "turn_interrupted" }]);
	});

	test("emits interrupted terminal event when prompt fails", async () => {
		const terminal: ChatChunk["event"][] = [];

		const result = await runTurn({
			agentName: "claude",
			threadId: "thread-1",
			projectId: "project-1",
			message: textMessage("hello"),
			emit: () => Promise.resolve(),
			emitTerminal: (event) => {
				terminal.push(event);
				return Promise.resolve();
			},
			runtime: {
				threadCoordinator: {
					prompt: async () =>
						Result.ok(
							(async function* failingPrompt() {
								await Promise.resolve();
								yield { type: "token" as const, text: "boom", messageId: "m1" };
								throw new Error("agent failed");
							})()
						),
				},
			} as never,
		});

		expect(result.isErr()).toBe(true);
		expect(terminal).toEqual([{ type: "turn_interrupted" }]);
	});
});
