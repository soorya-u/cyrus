import { describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import type { SessionConfigOption } from "@agentclientprotocol/sdk";
import type { AgentPool } from "@/core/acp/pool";
import { type CatalogOpsDeps, setCatalogField } from "./catalog-ops";
import { SessionMetadataStore } from "./metadata";
import { ThreadSessionStore } from "./sessions";

function createMockSession(
	sessionId: string,
	options: { native: boolean }
): RuntimeSession {
	const configOptions: SessionConfigOption[] = options.native
		? []
		: ([
				{
					type: "select",
					id: "model-config",
					category: "model",
					name: "Model",
					currentValue: "a",
					options: [
						{ value: "a", name: "A" },
						{ value: "b", name: "B" },
					],
				},
			] as SessionConfigOption[]);

	return {
		sessionId,
		transcript: {
			session: {
				models: options.native
					? { availableModels: [{ modelId: "model-1", name: "Model 1" }] }
					: undefined,
				modes: { availableModes: [] },
				configOptions,
			},
		},
		close: mock(async () => undefined),
		setModel: mock(async () => undefined),
		setMode: mock(async () => undefined),
		on: () => () => undefined,
	} as unknown as RuntimeSession;
}

async function createDeps(
	session: RuntimeSession,
	setSessionConfigOption: ReturnType<typeof mock>
): Promise<CatalogOpsDeps> {
	const pool = {
		getState: () => "ready",
		getRuntime: async () => ({
			newSession: () => Promise.resolve(session),
			agentCapabilities: { loadSession: true },
		}),
		getSdkConnection: () => ({ setSessionConfigOption }),
	} as unknown as AgentPool;

	const sessions = new ThreadSessionStore(
		"mock-agent",
		pool,
		new SessionMetadataStore()
	);
	await sessions.createBoundSession("thread-1", "project-1", "/tmp/project");

	return { agentName: "mock-agent", pool, sessions };
}

describe("setCatalogField(model)", () => {
	test("calls native session/set_model when the agent exposes availableModels", async () => {
		const session = createMockSession("session-1", { native: true });
		const setSessionConfigOption = mock(async () => undefined);
		const deps = await createDeps(session, setSessionConfigOption);

		await setCatalogField(
			deps,
			"model",
			"thread-1",
			"project-1",
			"/tmp/project",
			"session-1",
			"model-1"
		);

		expect(session.setModel).toHaveBeenCalledWith("model-1");
		expect(setSessionConfigOption).not.toHaveBeenCalled();
	});

	test("routes through the config-option fallback instead of session/set_model when the agent has no native model support", async () => {
		const session = createMockSession("session-1", { native: false });
		const setSessionConfigOption = mock(async () => undefined);
		const deps = await createDeps(session, setSessionConfigOption);

		await setCatalogField(
			deps,
			"model",
			"thread-1",
			"project-1",
			"/tmp/project",
			"session-1",
			"b"
		);

		expect(session.setModel).not.toHaveBeenCalled();
		expect(setSessionConfigOption).toHaveBeenCalledWith({
			sessionId: "session-1",
			configId: "model-config",
			value: "b",
		});
	});
});
