import { describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import type { AgentPool } from "@/core/acp/pool";
import { AgentRuntime } from "./runtime";

function createMockSession(sessionId: string): RuntimeSession {
	return {
		sessionId,
		transcript: {
			session: {
				models: {
					availableModels: [{ modelId: "model-1", name: "Model 1" }],
				},
				modes: { availableModes: [{ id: "mode-1", name: "Mode 1" }] },
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

function createMockPool(sessions: RuntimeSession[]): AgentPool {
	let next = 0;
	return {
		getState: () => "ready",
		getRuntime: async () => ({
			newSession: () => {
				const session =
					sessions[next] ?? createMockSession(`session-${next + 1}`);
				next += 1;
				return Promise.resolve(session);
			},
			agentCapabilities: { loadSession: true },
		}),
		getSdkConnection: () => undefined,
	} as unknown as AgentPool;
}

describe("AgentRuntime", () => {
	test("createBoundSession stores a thread-scoped session", async () => {
		const session = createMockSession("session-1");
		const runtime = new AgentRuntime("mock-agent", createMockPool([session]));

		const created = await runtime.createBoundSession(
			"thread-1",
			"project-1",
			"/tmp/project"
		);

		expect(created.sessionId).toBe("session-1");
		const models = await runtime.getCatalogField(
			"model",
			"thread-1",
			"project-1",
			"/tmp/project",
			"session-1"
		);
		expect(models).toEqual([
			{
				id: "model-1",
				name: "Model 1",
				description: null,
				context: null,
			},
		]);
	});

	test("closeSession removes an in-memory session", async () => {
		const session = createMockSession("session-1");
		const runtime = new AgentRuntime("mock-agent", createMockPool([session]));
		await runtime.createBoundSession("thread-1", "project-1", "/tmp/project");

		await runtime.closeSession("session-1", "thread-1");

		expect(session.close).toHaveBeenCalled();
	});

	test("reuses the same session for prompt after bind", async () => {
		const session = createMockSession("session-1");
		const runtime = new AgentRuntime("mock-agent", createMockPool([session]));
		await runtime.createBoundSession("thread-1", "project-1", "/tmp/project");

		const events: string[] = [];
		for await (const event of runtime.prompt(
			"thread-1",
			"project-1",
			"/tmp/project",
			"session-1",
			[{ type: "text", text: "hello" }],
			"turn-1"
		)) {
			events.push(event.type);
		}

		expect(session.prompt).toHaveBeenCalledWith("hello");
	});
});
