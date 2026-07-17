import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import { ThreadCoordinator } from "./coordinator";

const threadState = {
	id: "thread-1",
	projectId: "project-1",
	name: "Thread",
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
				commands: [],
				usage: {},
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
const resumeCalls: Array<{ sessionId: string; cwd: string }> = [];

mock.module("@acp-kit/core", () => ({
	openOrCreateRuntimeSession: ({
		sessionId,
		cwd,
	}: {
		sessionId: string;
		cwd: string;
	}) => {
		resumeCalls.push({ sessionId, cwd });
		const session = createMockSession(sessionId);
		sessions.push(session);
		return Promise.resolve({ session, created: false });
	},
}));

mock.module("@cyrus/database/repositories/git", () => ({
	resolveThreadGitCwd: () => Promise.resolve(Result.ok("/tmp/project")),
}));

mock.module("@cyrus/database/repositories/threads", () => ({
	getThread: () => Promise.resolve(Result.ok({ ...threadState })),
	bindAndLockThreadAgent: (
		_threadId: string,
		_projectId: string,
		data: { agentName: string; sessionId: string }
	) => {
		threadState.agentName = data.agentName;
		threadState.sessionId = data.sessionId;
		threadState.agentLocked = true;
		return Promise.resolve(Result.ok({ ...threadState }));
	},
	lockThreadAgent: (
		_threadId: string,
		_projectId: string,
		agentName: string
	) => {
		threadState.agentName = agentName;
		threadState.agentLocked = true;
		return Promise.resolve(Result.ok({ ...threadState }));
	},
	setAgentLocked: () => {
		threadState.agentLocked = true;
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

function seedCold(sessionId = "persisted-1") {
	threadState.agentName = "mock-agent";
	threadState.sessionId = sessionId;
	threadState.agentLocked = true;
}

describe("ThreadCoordinator session binding", () => {
	beforeEach(() => {
		sessions.length = 0;
		resumeCalls.length = 0;
		threadState.agentName = undefined;
		threadState.sessionId = undefined;
		threadState.agentLocked = undefined;
	});

	test("sessionBindingState is cold when only a persisted session id exists", async () => {
		seedCold();
		const coordinator = createCoordinator();
		const state = await coordinator.sessionBindingState("thread-1");
		expect(state.isOk()).toBe(true);
		if (state.isOk()) expect(state.value).toBe("cold");
		expect(coordinator.findLiveBinding("thread-1")).toBeNull();
	});

	test("catalog get resumes a cold session from the persisted session id", async () => {
		seedCold("persisted-1");
		const coordinator = createCoordinator();

		const models = await coordinator.catalog("thread-1", "model", {
			type: "get",
		});
		expect(models.isOk()).toBe(true);
		if (models.isOk()) {
			expect(models.value[0]?.id).toBe("model-1");
		}

		expect(resumeCalls).toEqual([
			{ sessionId: "persisted-1", cwd: "/tmp/project" },
		]);
		const liveState = await coordinator.sessionBindingState("thread-1");
		expect(liveState.isOk()).toBe(true);
		if (liveState.isOk()) expect(liveState.value).toBe("live");
		expect(coordinator.findLiveBinding("thread-1")).toEqual({
			threadId: "thread-1",
			agentName: "mock-agent",
			sessionId: "persisted-1",
			projectId: "project-1",
			cwd: "/tmp/project",
		});
	});

	test("catalog prefers the live binding after resume", async () => {
		seedCold("persisted-1");
		const coordinator = createCoordinator();

		await coordinator.catalog("thread-1", "model", { type: "get" });
		resumeCalls.length = 0;

		const models = await coordinator.catalog("thread-1", "model", {
			type: "get",
		});
		expect(models.isOk()).toBe(true);
		expect(resumeCalls).toEqual([]);
		if (models.isOk()) {
			expect(models.value[0]?.id).toBe("model-1");
		}
	});

	test("bind resumes a cold session then prompt uses the live session", async () => {
		seedCold("persisted-1");
		const coordinator = createCoordinator();

		const bound = await coordinator.bind("thread-1", "project-1", "mock-agent");
		expect(bound.isOk()).toBe(true);
		if (bound.isErr()) throw new Error("expected bind to succeed");
		expect(bound.value.sessionId).toBe("persisted-1");
		expect(resumeCalls).toEqual([
			{ sessionId: "persisted-1", cwd: "/tmp/project" },
		]);
		const liveState = await coordinator.sessionBindingState("thread-1");
		expect(liveState.isOk()).toBe(true);
		if (liveState.isOk()) expect(liveState.value).toBe("live");

		const prompt = await coordinator.prompt(
			"mock-agent",
			"thread-1",
			"project-1",
			[{ type: "text", text: "hello" }],
			"turn-1"
		);
		expect(prompt.isOk()).toBe(true);
		if (prompt.isErr()) throw new Error("expected prompt to succeed");
		for await (const _event of prompt.value) {
			/* drain */
		}
		expect(sessions[0]?.prompt).toHaveBeenCalledWith("hello");
	});

	test("catalog set errors when the live binding belongs to a different project", async () => {
		seedCold("persisted-1");
		const coordinator = createCoordinator();
		await coordinator.catalog("thread-1", "model", { type: "get" });

		const result = await coordinator.catalog("thread-1", "model", {
			type: "set",
			projectId: "other-project",
			value: "model-1",
		});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error._tag).toBe("coordinator.not_found");
		}
	});

	test("bind creates and locks a session for a locked thread without a session id", async () => {
		threadState.agentName = "mock-agent";
		threadState.agentLocked = true;
		const coordinator = createCoordinator();
		const bound = await coordinator.bind("thread-1", "project-1", "mock-agent");
		expect(bound.isOk()).toBe(true);
		if (bound.isErr()) throw new Error("expected bind to succeed");
		expect(bound.value.sessionId).toBe("session-1");
		expect(threadState.sessionId).toBe("session-1");
		const liveState = await coordinator.sessionBindingState("thread-1");
		expect(liveState.isOk()).toBe(true);
		if (liveState.isOk()) expect(liveState.value).toBe("live");
	});
});
