import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentEvent } from "@cyrus/schemas/rtc/chat";
import { runTurn } from "../../src/utils/run-turn";
import { createMockPromptStream } from "../helpers/acp-runtime";

describe("acp mock runtime", () => {
	test("streams token and completion events", () => {
		const events: AgentEvent[] = [];
		for (const event of createMockPromptStream({ message: "hello" })) {
			events.push(event);
		}

		expect(events).toEqual([
			{ type: "token", text: "hello", messageId: "mock-message-1" },
			{ type: "message_completed", text: "hello", messageId: "mock-message-1" },
		]);
	});

	test("drives runTurn through a mock coordinator", async () => {
		const emitted: Array<{ type: string }> = [];

		const result = await runTurn({
			agentName: "mock-agent",
			threadId: "thread-1",
			projectId: "project-1",
			message: "ping",
			emit: (event) => {
				emitted.push({ type: event.type });
				return Promise.resolve();
			},
			emitTerminal: () => Promise.resolve(),
			runtime: {
				threadCoordinator: {
					prompt: () => createMockPromptStream({ message: "pong" }),
				},
			} as never,
		});

		expect(result.isOk()).toBe(true);
		expect(emitted.map((event) => event.type)).toEqual([
			"user_message",
			"thread_started",
			"token",
			"message_completed",
		]);
	});

	test("emits turn_interrupted when the mock stream fails", async () => {
		const terminal: Array<{ type: string }> = [];

		const result = await runTurn({
			agentName: "mock-agent",
			threadId: "thread-1",
			projectId: "project-1",
			message: "ping",
			emit: () => Promise.resolve(),
			emitTerminal: (event) => {
				terminal.push({ type: event.type });
				return Promise.resolve();
			},
			runtime: {
				threadCoordinator: {
					prompt: () =>
						createMockPromptStream({
							message: "pong",
							failAfterToken: true,
						}),
				},
			} as never,
		});

		expect(result.isErr()).toBe(true);
		expect(terminal).toEqual([{ type: "turn_interrupted" }]);
	});
});

describe("cli process integration", () => {
	test("exits when start is invoked without a login token", async () => {
		const home = await mkdtemp(join(tmpdir(), "cyrus-cli-test-"));

		try {
			const proc = Bun.spawn(["bun", "src/cli.ts", "start"], {
				cwd: join(import.meta.dir, "../.."),
				env: {
					...process.env,
					CYRUS_HOME: home,
					CYRUS_DAEMON: "1",
				},
				stdout: "ignore",
				stderr: "ignore",
			});

			const exitCode = await proc.exited;
			expect(exitCode).toBe(1);
		} finally {
			await rm(home, { recursive: true, force: true });
		}
	});
});
