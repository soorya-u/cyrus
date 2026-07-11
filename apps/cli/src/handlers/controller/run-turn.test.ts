import { describe, expect, test } from "bun:test";
import type { ChatChunk } from "@cyrus/schemas/rtc/chat";
import { runTurn } from "./run-turn";

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
			message: "hello",
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
					prompt: () => prompt(),
				},
			} as never,
		});

		expect(result.isOk()).toBe(true);
		expect(emitted).toEqual([
			{ type: "user_message", content: "hello" },
			{ type: "thread_started", threadId: "thread-1" },
			{ type: "token", text: "done", messageId: "m1" },
		]);
		expect(terminal).toEqual([{ type: "turn_completed" }]);
	});

	test("emits interrupted terminal event when prompt fails", async () => {
		const terminal: ChatChunk["event"][] = [];

		const result = await runTurn({
			agentName: "claude",
			threadId: "thread-1",
			projectId: "project-1",
			message: "hello",
			emit: () => Promise.resolve(),
			emitTerminal: (event) => {
				terminal.push(event);
				return Promise.resolve();
			},
			runtime: {
				threadCoordinator: {
					prompt: () =>
						(async function* failingPrompt() {
							await Promise.resolve();
							yield { type: "token" as const, text: "boom", messageId: "m1" };
							throw new Error("agent failed");
						})(),
				},
			} as never,
		});

		expect(result.isErr()).toBe(true);
		expect(terminal).toEqual([{ type: "turn_interrupted" }]);
	});
});
