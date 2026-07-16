import { describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import type { AgentPool } from "@/core/acp/pool";
import { SessionMetadataStore } from "./metadata";
import { ThreadSessionStore } from "./sessions";

function createMockSession(sessionId: string): RuntimeSession {
	return {
		sessionId,
		transcript: {
			session: {
				configOptions: [],
				commands: [],
				usage: {},
			},
		},
		close: mock(async () => undefined),
		cancel: mock(async () => undefined),
		on: () => () => undefined,
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

describe("ThreadSessionStore", () => {
	test("createBoundSession stores a live session for the thread", async () => {
		const session = createMockSession("session-1");
		const metadata = new SessionMetadataStore();
		const store = new ThreadSessionStore(
			"mock-agent",
			createMockPool([session]),
			metadata
		);

		const created = await store.createBoundSession(
			"thread-1",
			"project-1",
			"/tmp/project"
		);

		expect(created.sessionId).toBe("session-1");
		expect(store.getLiveSession("thread-1")).toEqual({
			sessionId: "session-1",
			projectId: "project-1",
			cwd: "/tmp/project",
		});
	});

	test("close removes the live session and detaches metadata", async () => {
		const session = createMockSession("session-1");
		const metadata = new SessionMetadataStore();
		const store = new ThreadSessionStore(
			"mock-agent",
			createMockPool([session]),
			metadata
		);
		await store.createBoundSession("thread-1", "project-1", "/tmp/project");

		await store.close("thread-1");

		expect(session.close).toHaveBeenCalled();
		expect(store.getLiveSession("thread-1")).toBeNull();
	});

	test("requireSession reuses an existing in-memory session", async () => {
		const session = createMockSession("session-1");
		const store = new ThreadSessionStore(
			"mock-agent",
			createMockPool([session]),
			new SessionMetadataStore()
		);
		await store.createBoundSession("thread-1", "project-1", "/tmp/project");

		const required = await store.requireSession(
			"thread-1",
			"project-1",
			"/tmp/project",
			"session-1"
		);

		expect(required.sessionId).toBe("session-1");
	});

	test("closeSession by id closes and clears the matching thread", async () => {
		const session = createMockSession("session-1");
		const store = new ThreadSessionStore(
			"mock-agent",
			createMockPool([session]),
			new SessionMetadataStore()
		);
		await store.createBoundSession("thread-1", "project-1", "/tmp/project");

		await store.closeSession("session-1", "thread-1");

		expect(session.close).toHaveBeenCalled();
		expect(store.getLiveSession("thread-1")).toBeNull();
	});
});
