import { describe, expect, test } from "bun:test";
import { coordinatorRuntimeError } from "@cyrus/errors/coordinator";
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
		const emitted: ChatChunk["event"][] = [];

		const result = await runTurn({
			agentName: "claude",
			threadId: "thread-1",
			projectId: "project-1",
			message: textMessage("hello"),
			emit: (event) => {
				if (event.type === "user_message") {
					return Promise.reject(new Error("emit failed"));
				}
				emitted.push(event);
				return Promise.resolve();
			},
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
		expect(emitted).toContainEqual({
			type: "thread_error",
			message: "emit failed",
			code: "turn.emit_failed",
		});
		expect(terminal).toEqual([{ type: "turn_interrupted" }]);
	});

	test("emits thread error and interrupted terminal event when prompt fails", async () => {
		const terminal: ChatChunk["event"][] = [];
		const emitted: ChatChunk["event"][] = [];

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
					prompt: async () =>
						Result.err(coordinatorRuntimeError("prompt failed")),
				},
			} as never,
		});

		expect(result.isErr()).toBe(true);
		expect(emitted).toContainEqual({
			type: "thread_error",
			message: "prompt failed",
			code: "coordinator.runtime",
		});
		expect(terminal).toEqual([{ type: "turn_interrupted" }]);
	});

	test("emits interrupted terminal event when streamed prompt fails", async () => {
		const terminal: ChatChunk["event"][] = [];
		const emitted: ChatChunk["event"][] = [];

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
		expect(emitted).toContainEqual({
			type: "thread_error",
			message: "agent failed",
			code: "turn.stream_failed",
		});
		expect(terminal).toEqual([{ type: "turn_interrupted" }]);
	});
});
