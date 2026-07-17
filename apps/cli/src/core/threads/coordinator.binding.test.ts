import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import { ThreadCoordinator } from "./coordinator";

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

describe("ThreadCoordinator binding", () => {
	beforeEach(() => {
		sessions.length = 0;
		threadState.agentName = undefined;
		threadState.sessionId = undefined;
		threadState.agentLocked = undefined;
	});

	test("catalog prefers the live binding after bindAgent", async () => {
		const coordinator = createCoordinator();
		const bound = await coordinator.bindAgent(
			"thread-1",
			"project-1",
			"mock-agent"
		);
		expect(bound.isOk()).toBe(true);

		const live = coordinator.findLiveBinding("thread-1");
		expect(live).toEqual({
			threadId: "thread-1",
			agentName: "mock-agent",
			sessionId: "session-1",
			projectId: "project-1",
			cwd: "/tmp/project",
		});

		const models = await coordinator.catalog("thread-1", "model", {
			type: "get",
		});
		expect(models.isOk()).toBe(true);
		if (models.isOk()) {
			expect(models.value[0]?.id).toBe("model-1");
		}
	});

	test("catalog set errors when live binding belongs to a different project", async () => {
		const coordinator = createCoordinator();
		await coordinator.bindAgent("thread-1", "project-1", "mock-agent");

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

	test("findLiveBinding returns null when no session is live", () => {
		const coordinator = createCoordinator();
		expect(coordinator.findLiveBinding("missing")).toBeNull();
	});
});
