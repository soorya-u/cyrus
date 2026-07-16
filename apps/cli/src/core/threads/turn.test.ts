import { describe, expect, mock, test } from "bun:test";
import { CoordinatorAgentMismatchError } from "@cyrus/errors/coordinator";
import { Result } from "better-result";
import type { AgentRuntime } from "@/core/agents/runtime";
import { cancel, prompt } from "./turn";
import type { BoundThread, CoordinatorHost } from "./types";

function bound(): BoundThread {
	return {
		threadId: "thread-1",
		projectId: "project-1",
		agentName: "claude",
		sessionId: "session-1",
		cwd: "/tmp/project",
	};
}

function createHost(
	overrides?: Partial<CoordinatorHost> & {
		agent?: AgentRuntime;
	}
): CoordinatorHost {
	const agent =
		overrides?.agent ??
		({
			prompt: mock(function* () {
				yield { type: "token", text: "hi", messageId: "1" };
			}),
			cancel: mock(async () => undefined),
			closeSession: mock(async () => undefined),
		} as unknown as AgentRuntime);

	return {
		getAgent: () => agent,
		findLiveBinding: () => bound(),
		withRuntime: async (fn) => Result.ok(await fn()),
		resolveBoundThread: async () => Result.ok(bound()),
		resolveCwd: async () => Result.ok("/tmp/project"),
		...overrides,
	};
}

describe("thread turn helpers", () => {
	test("prompt rejects when the agent name does not match the binding", async () => {
		const result = await prompt(
			createHost(),
			"codex",
			"thread-1",
			"project-1",
			[{ type: "text", text: "hi" }],
			"turn-1"
		);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(CoordinatorAgentMismatchError.is(result.error)).toBe(true);
		}
	});

	test("prompt returns a generator when the agent matches", async () => {
		const result = await prompt(
			createHost(),
			"claude",
			"thread-1",
			"project-1",
			[{ type: "text", text: "hi" }],
			"turn-1"
		);
		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const events: string[] = [];
			for await (const event of result.value) events.push(event.type);
			expect(events).toEqual(["token"]);
		}
	});

	test("cancel forwards to the agent runtime", async () => {
		const cancelFn = mock(async () => undefined);
		const host = createHost({
			agent: { cancel: cancelFn } as unknown as AgentRuntime,
		});
		await cancel(host, "claude", "thread-1");
		expect(cancelFn).toHaveBeenCalledWith("thread-1");
	});
});
