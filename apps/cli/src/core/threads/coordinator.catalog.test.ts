import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import { ThreadCoordinator } from "./coordinator";

const threadState = {
	id: "thread-1",
	projectId: "project-1",
	name: "Thread",
	agentName: "mock-agent" as string | undefined,
	sessionId: "persisted-1" as string | undefined,
	agentLocked: true as true | undefined,
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
				modes: { availableModes: [{ id: "mode-1", name: "Mode 1" }] },
				configOptions: [
					{
						id: "effort",
						type: "select",
						category: "thought_level",
						name: "Effort",
						options: [{ value: "high", name: "High" }],
						currentValue: "high",
					},
					{
						id: "persona",
						type: "select",
						category: "persona",
						name: "Persona",
						options: [{ value: "default", name: "Default" }],
						currentValue: "default",
					},
				],
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

mock.module("@acp-kit/core", () => ({
	openOrCreateRuntimeSession: ({ sessionId }: { sessionId: string }) => {
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
		getSdkConnection: () => ({
			setSessionConfigOption: mock(async () => undefined),
		}),
	} as unknown as AgentPool;

	return new ThreadCoordinator(pool);
}

describe("ThreadCoordinator catalog", () => {
	beforeEach(() => {
		sessions.length = 0;
		threadState.agentName = "mock-agent";
		threadState.sessionId = "persisted-1";
		threadState.agentLocked = true;
	});

	test("catalog get returns models from the resumed session", async () => {
		const coordinator = createCoordinator();

		const models = await coordinator.catalog("thread-1", "model", {
			type: "get",
		});
		expect(models.isOk()).toBe(true);
		if (models.isErr()) throw new Error("expected catalog get to succeed");
		expect(models.value).toEqual([
			{
				id: "model-1",
				name: "Model 1",
				description: null,
				context: null,
			},
		]);
	});

	test("catalog get returns modes, efforts, and personas", async () => {
		const coordinator = createCoordinator();

		const modes = await coordinator.catalog("thread-1", "mode", {
			type: "get",
		});
		const efforts = await coordinator.catalog("thread-1", "effort", {
			type: "get",
		});
		const personas = await coordinator.catalog("thread-1", "persona", {
			type: "get",
		});

		expect(modes.isOk()).toBe(true);
		expect(efforts.isOk()).toBe(true);
		expect(personas.isOk()).toBe(true);
		if (modes.isOk()) {
			expect(modes.value).toEqual([{ id: "mode-1", name: "Mode 1" }]);
		}
		if (efforts.isOk()) {
			expect(efforts.value).toEqual([{ id: "high", name: "High" }]);
		}
		if (personas.isOk()) {
			expect(personas.value).toEqual([{ id: "default", name: "Default" }]);
		}
	});

	test("catalog set applies the model on the bound session", async () => {
		const coordinator = createCoordinator();

		const result = await coordinator.catalog("thread-1", "model", {
			type: "set",
			projectId: "project-1",
			value: "model-1",
		});
		expect(result.isOk()).toBe(true);
		expect(sessions[0]?.setModel).toHaveBeenCalledWith("model-1");
	});

	test("catalog get surfaces unbound errors", async () => {
		threadState.agentName = undefined;
		threadState.sessionId = undefined;
		threadState.agentLocked = undefined;
		const coordinator = createCoordinator();
		const result = await coordinator.catalog("thread-1", "model", {
			type: "get",
		});
		expect(result.isErr()).toBe(true);
	});

	test("catalog set and ensureSession are mutually exclusive under the per-thread lock", async () => {
		const coordinator = createCoordinator();
		await coordinator.catalog("thread-1", "model", { type: "get" });

		let releaseSet!: () => void;
		const setGate = new Promise<void>((resolve) => {
			releaseSet = resolve;
		});
		let setEntered!: () => void;
		const setEnteredPromise = new Promise<void>((resolve) => {
			setEntered = resolve;
		});

		const originalSetModel = sessions[0]?.setModel;
		if (!(sessions[0] && originalSetModel)) {
			throw new Error("expected resumed session");
		}
		sessions[0].setModel = mock(async (modelId: string) => {
			setEntered();
			await setGate;
			return originalSetModel(modelId);
		});

		const order: string[] = [];
		const setPromise = coordinator
			.catalog("thread-1", "model", {
				type: "set",
				projectId: "project-1",
				value: "model-1",
			})
			.then((result) => {
				order.push("set-done");
				return result;
			});

		await setEnteredPromise;

		const ensurePromise = coordinator
			.ensureSession("thread-1", "project-1", "mock-agent")
			.then((result) => {
				order.push("ensure-done");
				return result;
			});

		await Promise.resolve();
		expect(order).toEqual([]);

		releaseSet();
		const [setResult, ensureResult] = await Promise.all([
			setPromise,
			ensurePromise,
		]);

		expect(setResult.isOk()).toBe(true);
		expect(ensureResult.isOk()).toBe(true);
		expect(order).toEqual(["set-done", "ensure-done"]);
	});
});
