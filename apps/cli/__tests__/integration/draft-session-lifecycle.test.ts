import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import { CoordinatorAgentLockedError } from "@cyrus/errors/coordinator";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import { ThreadCoordinator } from "@/core/threads/coordinator";

const threadState = {
	id: "thread-1",
	projectId: "project-1",
	name: "Draft",
	agentName: undefined as string | undefined,
	sessionId: undefined as string | undefined,
	agentLocked: undefined as true | undefined,
	createdAt: "2026-07-12T00:00:00.000Z",
	updatedAt: "2026-07-12T00:00:00.000Z",
};

function createMockSession(sessionId: string): RuntimeSession {
	return {
		sessionId,
		transcript: {
			session: {
				models: {
					availableModels: [{ modelId: "model-1", name: "Model 1" }],
				},
				modes: { availableModes: [] },
				configOptions: [],
			},
		},
		close: mock(async () => undefined),
		setModel: mock(async () => undefined),
		setMode: mock(async () => undefined),
		on: () => () => undefined,
		prompt: mock(async () => ({})),
		cancel: mock(async () => undefined),
	} as unknown as RuntimeSession;
}

const sessions: RuntimeSession[] = [];

mock.module("@cyrus/database/repositories/git", () => ({
	resolveThreadGitCwd: async () => Result.ok("/tmp/project"),
}));

mock.module("@cyrus/database/repositories/threads", () => ({
	getThread: async () => Result.ok({ ...threadState }),
	bindThreadAgent: (
		_threadId: string,
		_projectId: string,
		data: { agentName: string; sessionId: string }
	) => {
		threadState.agentName = data.agentName;
		threadState.sessionId = data.sessionId;
		return Promise.resolve(Result.ok({ ...threadState }));
	},
	clearThreadDraftBinding: () => {
		threadState.agentName = undefined;
		threadState.sessionId = undefined;
		return Promise.resolve(Result.ok({ ...threadState }));
	},
}));

function createCoordinator() {
	const pool = {
		getState: () => "ready",
		getRuntime: async () => ({
			newSession: () => {
				const session = createMockSession(`session-${sessions.length + 1}`);
				sessions.push(session);
				return Promise.resolve(session);
			},
			agentCapabilities: { loadSession: true },
		}),
		getSdkConnection: () => undefined,
	} as unknown as AgentPool;

	return new ThreadCoordinator(pool);
}

describe("draft session lifecycle", () => {
	beforeEach(() => {
		sessions.length = 0;
		threadState.agentName = undefined;
		threadState.sessionId = undefined;
		threadState.agentLocked = undefined;
	});

	test("bind keeps session in memory until persistBoundSession", async () => {
		const coordinator = createCoordinator();

		const bound = await coordinator.bindAgent(
			"thread-1",
			"project-1",
			"mock-agent"
		);
		expect(bound.isOk()).toBe(true);
		if (bound.isErr()) throw new Error("expected bind to succeed");
		expect(bound.value.sessionId).toBe("session-1");
		expect(bound.value.capabilities).toEqual({ loadSession: true });
		expect(threadState.sessionId).toBeUndefined();
		expect(threadState.agentName).toBeUndefined();

		const models = await coordinator.getModels("thread-1");
		expect(models.isOk()).toBe(true);
		if (models.isErr()) throw new Error("expected models to succeed");
		expect(models.value[0]?.id).toBe("model-1");

		const persisted = await coordinator.persistBoundSession(
			"thread-1",
			"project-1"
		);
		expect(persisted.isOk()).toBe(true);
		expect(threadState.sessionId).toBe("session-1");
		expect(threadState.agentName).toBe("mock-agent");

		const prompt = await coordinator.prompt(
			"mock-agent",
			"thread-1",
			"project-1",
			[{ type: "text", text: "hello" }],
			"turn-1"
		);
		expect(prompt.isOk()).toBe(true);
		if (prompt.isErr()) throw new Error("expected prompt to succeed");

		const events: string[] = [];
		for await (const event of prompt.value) {
			events.push(event.type);
		}

		expect(sessions).toHaveLength(1);
		expect(sessions[0]?.sessionId).toBe("session-1");
		expect(sessions[0]?.prompt).toHaveBeenCalledWith("hello");
	});

	test("rejects agent switch when locked", async () => {
		threadState.agentName = "mock-agent";
		threadState.sessionId = "session-1";
		threadState.agentLocked = true;

		const coordinator = createCoordinator();

		const result = await coordinator.bindAgent(
			"thread-1",
			"project-1",
			"other-agent"
		);
		expect(result.isErr()).toBe(true);
		if (result.isOk()) throw new Error("expected bind to fail");
		expect(CoordinatorAgentLockedError.is(result.error)).toBe(true);
	});

	test("closeThreadSession closes the bound runtime session", async () => {
		const coordinator = createCoordinator();
		const bound = await coordinator.bindAgent(
			"thread-1",
			"project-1",
			"mock-agent"
		);
		expect(bound.isOk()).toBe(true);
		if (bound.isErr()) throw new Error("expected bind to succeed");

		await coordinator.closeThreadSession(
			"thread-1",
			bound.value.sessionId,
			"mock-agent"
		);

		expect(sessions[0]?.close).toHaveBeenCalled();
	});

	test("clears stale draft db binding without resuming it", async () => {
		threadState.agentName = "mock-agent";
		threadState.sessionId = "stale-session";
		threadState.agentLocked = undefined;

		const coordinator = createCoordinator();
		const bound = await coordinator.bindAgent(
			"thread-1",
			"project-1",
			"mock-agent"
		);
		expect(bound.isOk()).toBe(true);
		if (bound.isErr()) throw new Error("expected bind to succeed");
		expect(bound.value.sessionId).toBe("session-1");
		expect(threadState.sessionId).toBeUndefined();
		expect(threadState.agentName).toBeUndefined();
	});
});
