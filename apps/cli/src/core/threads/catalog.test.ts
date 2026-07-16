import { describe, expect, mock, test } from "bun:test";
import { Result } from "better-result";
import type { AgentRuntime } from "@/core/agents/runtime";
import { getModels, setModel } from "./catalog";
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
			getModels: mock(async () => [{ id: "m1", name: "M1" }]),
			setModel: mock(async () => undefined),
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

describe("thread catalog helpers", () => {
	test("getModels resolves the bound agent and returns models", async () => {
		const host = createHost();
		const result = await getModels(host, "thread-1");
		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value).toEqual([{ id: "m1", name: "M1" }]);
		}
	});

	test("setModel forwards to the bound agent runtime", async () => {
		const setModelFn = mock(async () => undefined);
		const host = createHost({
			agent: {
				setModel: setModelFn,
			} as unknown as AgentRuntime,
		});

		const result = await setModel(host, "thread-1", "project-1", "m1");
		expect(result.isOk()).toBe(true);
		expect(setModelFn).toHaveBeenCalledWith(
			"thread-1",
			"project-1",
			"/tmp/project",
			"session-1",
			"m1"
		);
	});

	test("getModels surfaces resolve errors", async () => {
		const host = createHost({
			resolveBoundThread: async () =>
				Result.err({
					_tag: "CoordinatorAgentNotBoundError",
					message: "not bound",
				} as never),
		});
		const result = await getModels(host, "thread-1");
		expect(result.isErr()).toBe(true);
	});
});
