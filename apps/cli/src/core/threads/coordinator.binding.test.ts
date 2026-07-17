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

function seedCommittedCold(sessionId = "persisted-1") {
	threadState.agentName = "mock-agent";
	threadState.sessionId = sessionId;
	threadState.agentLocked = true;
}

describe("ThreadCoordinator live/cold binding", () => {
	beforeEach(() => {
		sessions.length = 0;
		resumeCalls.length = 0;
		threadState.agentName = undefined;
		threadState.sessionId = undefined;
		threadState.agentLocked = undefined;
	});

	test("findLiveBinding is null when the session is cold", () => {
		seedCommittedCold();
		const coordinator = createCoordinator();
		expect(coordinator.findLiveBinding("thread-1")).toBeNull();
	});

	test("catalog get resumes a cold session from the persisted session id", async () => {
		seedCommittedCold("persisted-1");
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
		expect(coordinator.findLiveBinding("thread-1")).toEqual({
			threadId: "thread-1",
			agentName: "mock-agent",
			sessionId: "persisted-1",
			projectId: "project-1",
			cwd: "/tmp/project",
		});
	});

	test("catalog prefers the live binding after resume", async () => {
		seedCommittedCold("persisted-1");
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

	test("catalog set errors when the live binding belongs to a different project", async () => {
		seedCommittedCold("persisted-1");
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

	test("ensureSession creates and locks a session for an unbound thread", async () => {
		const coordinator = createCoordinator();
		const bound = await coordinator.ensureSession(
			"thread-1",
			"project-1",
			"mock-agent"
		);
		expect(bound.isOk()).toBe(true);
		if (bound.isErr()) throw new Error("expected ensureSession to succeed");
		expect(bound.value.sessionId).toBe("session-1");
		expect(threadState.agentName).toBe("mock-agent");
		expect(threadState.sessionId).toBe("session-1");
		expect(threadState.agentLocked).toBe(true);
		expect(coordinator.findLiveBinding("thread-1")?.sessionId).toBe(
			"session-1"
		);
	});
});
