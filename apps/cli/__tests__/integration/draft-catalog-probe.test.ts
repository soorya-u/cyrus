import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import { CoordinatorRuntimeError } from "@cyrus/errors/coordinator";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import { ThreadCoordinator } from "@/core/threads/coordinator";

const sessions: RuntimeSession[] = [];
let failNextSession = false;

function createMockSession(sessionId: string): RuntimeSession {
	return {
		sessionId,
		transcript: {
			session: {
				models: {
					availableModels: [{ modelId: "model-1", name: "Model 1" }],
					currentModelId: "model-1",
				},
				modes: {
					availableModes: [{ id: "mode-1", name: "Mode 1" }],
					currentModeId: "mode-1",
				},
				configOptions: [
					{
						id: "effort",
						category: "thought_level",
						type: "select",
						options: [{ value: "high", name: "High" }],
						currentValue: "high",
					},
					{
						id: "persona",
						category: "persona",
						type: "select",
						options: [{ value: "coder", name: "Coder" }],
						currentValue: "coder",
					},
				],
				commands: [{ name: "test", description: "Run tests", input: null }],
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

mock.module("@cyrus/database/repositories/projects", () => ({
	resolveProjectCwd: (projectId: string) => {
		if (projectId === "missing") {
			return Promise.resolve(
				Result.err({
					_tag: "repository/not_found",
					entity: "project",
					id: projectId,
					message: `project not found: ${projectId}`,
					orpcCode: "NOT_FOUND",
				})
			);
		}
		return Promise.resolve(Result.ok("/tmp/project"));
	},
	getProject: () =>
		Promise.resolve(Result.ok({ id: "project-1", cwd: "/tmp/project" })),
}));

function createCoordinator() {
	const pool = {
		getState: () => "ready",
		getRuntime: async () => ({
			newSession: () => {
				if (failNextSession) {
					failNextSession = false;
					return Promise.reject(new Error("probe spawn failed"));
				}
				const session = createMockSession(`session-${sessions.length + 1}`);
				sessions.push(session);
				return Promise.resolve(session);
			},
			agentCapabilities: {
				loadSession: true,
				promptCapabilities: { image: true },
			},
		}),
		getSdkConnection: () => undefined,
	} as unknown as AgentPool;

	return new ThreadCoordinator(pool);
}

describe("getDraftCatalog probe", () => {
	beforeEach(() => {
		sessions.length = 0;
		failNextSession = false;
	});

	test("captures catalog then closes with zero live sessions", async () => {
		const coordinator = createCoordinator();

		const catalog = await coordinator.getDraftCatalog(
			"mock-agent",
			"project-1"
		);
		expect(catalog.isOk()).toBe(true);
		if (catalog.isErr()) throw new Error("expected probe to succeed");

		expect(catalog.value.models[0]?.id).toBe("model-1");
		expect(catalog.value.modes[0]?.id).toBe("mode-1");
		expect(catalog.value.efforts[0]?.id).toBe("high");
		expect(catalog.value.personas[0]?.id).toBe("coder");
		expect(catalog.value.commands?.[0]?.name).toBe("test");
		expect(catalog.value.capabilities).toEqual({
			loadSession: true,
			promptCapabilities: { image: true },
		});

		expect(sessions).toHaveLength(1);
		expect(sessions[0]?.close).toHaveBeenCalled();
		expect(coordinator.findLiveBinding("any-thread")).toBeNull();
	});

	test("probe failure returns an error value with no leaked session", async () => {
		failNextSession = true;
		const coordinator = createCoordinator();

		const catalog = await coordinator.getDraftCatalog(
			"mock-agent",
			"project-1"
		);
		expect(catalog.isErr()).toBe(true);
		if (catalog.isOk()) throw new Error("expected probe to fail");
		expect(CoordinatorRuntimeError.is(catalog.error)).toBe(true);

		expect(sessions).toHaveLength(0);
		expect(coordinator.findLiveBinding("any-thread")).toBeNull();
	});
});
