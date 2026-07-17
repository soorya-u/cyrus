import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { RuntimeSession } from "@acp-kit/core";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import { ThreadCoordinator } from "./coordinator";

type ThreadRow = {
	id: string;
	projectId: string;
	name: string;
	agentName: string | undefined;
	sessionId: string | undefined;
	agentLocked: true | undefined;
	branch: string | null;
	worktreePath: string | null;
	createdAt: string;
	updatedAt: string;
};

const threads = new Map<string, ThreadRow>();
const conversations: Array<{
	threadId: string;
	turnId: string;
	event: { type: string; message?: string; content?: string };
}> = [];
const ops: string[] = [];

let projectCwd = "/tmp/project";
let sessionCreateError: Error | null = null;
let setModelError: Error | null = null;
const sessions: RuntimeSession[] = [];
let nextSessionCwd: string | undefined;

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
			},
		},
		close: mock(async () => undefined),
		setModel: mock(() => {
			ops.push("preferences");
			if (setModelError) return Promise.reject(setModelError);
			return Promise.resolve();
		}),
		setMode: mock(async () => undefined),
		on: () => () => undefined,
		prompt: mock(async () => ({})),
		cancel: mock(async () => undefined),
	} as unknown as RuntimeSession;
}

mock.module("@cyrus/database/repositories/projects", () => ({
	resolveProjectCwd: () => Promise.resolve(Result.ok(projectCwd)),
	getProject: () =>
		Promise.resolve(
			Result.ok({ id: "project-1", name: "Project", cwd: projectCwd })
		),
}));

mock.module("@cyrus/database/repositories/git", () => ({
	resolveThreadGitCwd: (threadId: string) => {
		const thread = threads.get(threadId);
		if (!thread)
			return Promise.resolve(
				Result.err(new Error(`thread ${threadId} not found`))
			);
		return Promise.resolve(Result.ok(thread.worktreePath ?? projectCwd));
	},
}));

mock.module("@cyrus/database/repositories/threads", () => ({
	createThread: (
		projectId: string,
		options?: { branch?: string; worktreePath?: string }
	) => {
		ops.push("createThread");
		const id = `thread-${threads.size + 1}`;
		const now = "2026-07-17T00:00:00.000Z";
		const row: ThreadRow = {
			id,
			projectId,
			name: options?.branch ?? "New thread",
			agentName: undefined,
			sessionId: undefined,
			agentLocked: undefined,
			branch: options?.branch ?? null,
			worktreePath: options?.worktreePath ?? null,
			createdAt: now,
			updatedAt: now,
		};
		threads.set(id, row);
		return Promise.resolve(Result.ok({ ...row }));
	},
	getThread: (threadId: string) => {
		const row = threads.get(threadId);
		return Promise.resolve(Result.ok(row ? { ...row } : undefined));
	},
	bindThreadAgent: (
		threadId: string,
		_projectId: string,
		data: { agentName: string; sessionId: string }
	) => {
		ops.push("bindThreadAgent");
		const row = threads.get(threadId);
		if (!row) return Promise.resolve(Result.err(new Error("not found")));
		row.agentName = data.agentName;
		row.sessionId = data.sessionId;
		return Promise.resolve(Result.ok({ ...row }));
	},
	setAgentLocked: (threadId: string) => {
		ops.push("setAgentLocked");
		const row = threads.get(threadId);
		if (!row) return Promise.resolve(Result.err(new Error("not found")));
		row.agentLocked = true;
		return Promise.resolve(Result.ok({ ...row }));
	},
	updateThreadWorktreePath: (threadId: string, worktreePath: string | null) => {
		ops.push("git");
		const row = threads.get(threadId);
		if (!row) return Promise.resolve(Result.err(new Error("not found")));
		row.worktreePath = worktreePath;
		return Promise.resolve(Result.ok({ ...row }));
	},
	clearThreadDraftBinding: () => Promise.resolve(Result.ok(undefined)),
}));

mock.module("@cyrus/database/repositories/conversations", () => ({
	appendConversation: (
		threadId: string,
		entry: {
			threadId: string;
			turnId: string;
			event: { type: string; message?: string; content?: string };
		}
	) => {
		conversations.push({
			threadId,
			turnId: entry.turnId,
			event: entry.event,
		});
		return Promise.resolve(
			Result.ok({
				chunk: {
					threadId,
					turnId: entry.turnId,
					seq: conversations.length,
					event: entry.event,
				},
			})
		);
	},
}));

mock.module("@/git/worktree", () => ({
	createGitWorktree: (_projectCwd: string, refName: string, path?: string) => {
		ops.push("git");
		return Promise.resolve(Result.ok(path ?? `/tmp/worktrees/${refName}`));
	},
	removeGitWorktree: () => Promise.resolve(Result.ok(undefined)),
}));

mock.module("@/git/checkout", () => ({
	tryCheckoutGitRef: () => {
		ops.push("git");
		return Promise.resolve(Result.ok(undefined));
	},
	checkoutGitRef: () => Promise.resolve(Result.ok(undefined)),
}));

function createCoordinator() {
	const pool = {
		getState: () => "ready",
		getRuntime: async () => ({
			newSession: ({ cwd }: { cwd: string }) => {
				ops.push("createBoundSession");
				nextSessionCwd = cwd;
				if (sessionCreateError) {
					return Promise.reject(sessionCreateError);
				}
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

describe("startThread", () => {
	beforeEach(() => {
		threads.clear();
		conversations.length = 0;
		ops.length = 0;
		sessions.length = 0;
		sessionCreateError = null;
		setModelError = null;
		nextSessionCwd = undefined;
		projectCwd = "/tmp/project";
	});

	test("births a thread with a bound session ready to prompt", async () => {
		const coordinator = createCoordinator();

		const started = await coordinator.startThread({
			projectId: "project-1",
			agentName: "mock-agent",
			message: [{ type: "text", text: "hello" }],
			branch: "main",
			preferences: { modelId: "model-1" },
			turnId: "turn-1",
		});

		expect(started.isOk()).toBe(true);
		if (started.isErr()) throw new Error("expected startThread to succeed");
		expect(started.value.bound).not.toBeNull();
		expect(started.value.turnId).toBe("turn-1");
		expect(ops).toEqual([
			"createThread",
			"git",
			"createBoundSession",
			"preferences",
			"bindThreadAgent",
			"setAgentLocked",
		]);

		const thread = threads.get(started.value.threadId);
		expect(thread?.agentName).toBe("mock-agent");
		expect(thread?.sessionId).toBe("session-1");
		expect(thread?.agentLocked).toBe(true);

		const prompt = await coordinator.prompt(
			"mock-agent",
			started.value.threadId,
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

	test("session failure after row creation leaves the message and an error entry", async () => {
		sessionCreateError = new Error("session boom");
		const coordinator = createCoordinator();

		const started = await coordinator.startThread({
			projectId: "project-1",
			agentName: "mock-agent",
			message: [{ type: "text", text: "keep me" }],
			turnId: "turn-fail",
		});

		expect(started.isOk()).toBe(true);
		if (started.isErr()) throw new Error("expected ok with bound null");
		expect(started.value.bound).toBeNull();
		expect(threads.has(started.value.threadId)).toBe(true);

		const thread = threads.get(started.value.threadId);
		expect(thread?.sessionId).toBeUndefined();
		expect(thread?.agentLocked).toBeUndefined();

		expect(conversations).toHaveLength(3);
		expect(conversations[0]).toMatchObject({
			threadId: started.value.threadId,
			turnId: "turn-fail",
			event: { type: "user_message", content: "keep me" },
		});
		expect(conversations[1]).toMatchObject({
			threadId: started.value.threadId,
			turnId: "turn-fail",
			event: { type: "thread_error", code: "coordinator.runtime" },
		});
		expect(conversations[1]?.event.message).toContain("session boom");
		expect(conversations[2]).toMatchObject({
			threadId: started.value.threadId,
			turnId: "turn-fail",
			event: { type: "turn_interrupted" },
		});
	});

	test("creates the session at the worktree cwd when a worktree is requested", async () => {
		const coordinator = createCoordinator();

		const started = await coordinator.startThread({
			projectId: "project-1",
			agentName: "mock-agent",
			message: [{ type: "text", text: "in worktree" }],
			branch: "feature",
			worktree: true,
			turnId: "turn-wt",
		});

		expect(started.isOk()).toBe(true);
		if (started.isErr()) throw new Error("expected ok");
		expect(started.value.bound?.cwd).toBe("/tmp/worktrees/feature");
		expect(nextSessionCwd).toBe("/tmp/worktrees/feature");
		expect(threads.get(started.value.threadId)?.worktreePath).toBe(
			"/tmp/worktrees/feature"
		);
	});

	test("rejects worktree without a branch before creating a session", async () => {
		const coordinator = createCoordinator();

		const started = await coordinator.startThread({
			projectId: "project-1",
			agentName: "mock-agent",
			message: [{ type: "text", text: "no branch" }],
			worktree: true,
			turnId: "turn-wt-missing-branch",
		});

		expect(started.isOk()).toBe(true);
		if (started.isErr()) throw new Error("expected ok with bound null");
		expect(started.value.bound).toBeNull();
		expect(sessions).toHaveLength(0);
		expect(conversations[1]?.event.message).toContain(
			"worktree requires a branch"
		);
	});

	test("applies draft model preference on the new session", async () => {
		const coordinator = createCoordinator();

		const started = await coordinator.startThread({
			projectId: "project-1",
			agentName: "mock-agent",
			message: [{ type: "text", text: "with model" }],
			preferences: { modelId: "model-1" },
			turnId: "turn-prefs",
		});

		expect(started.isOk()).toBe(true);
		if (started.isErr()) throw new Error("expected ok");
		expect(started.value.bound).not.toBeNull();
		expect(sessions[0]?.setModel).toHaveBeenCalledWith("model-1");
	});

	test("skips unsupported model preference and still binds the session", async () => {
		setModelError = new Error(
			'Unhandled exception: "Method not found": session/set_model'
		);
		const coordinator = createCoordinator();

		const started = await coordinator.startThread({
			projectId: "project-1",
			agentName: "mock-agent",
			message: [{ type: "text", text: "unsupported model" }],
			preferences: { modelId: "model-1" },
			turnId: "turn-prefs-skip",
		});

		expect(started.isOk()).toBe(true);
		if (started.isErr()) throw new Error("expected ok");
		expect(started.value.bound).not.toBeNull();
		expect(sessions[0]?.setModel).toHaveBeenCalledWith("model-1");
		expect(
			conversations.some((entry) => entry.event.type === "thread_error")
		).toBe(false);
	});

	test("after a mid-flight failure the thread can be bound and prompted for retry", async () => {
		sessionCreateError = new Error("session boom");
		const coordinator = createCoordinator();

		const started = await coordinator.startThread({
			projectId: "project-1",
			agentName: "mock-agent",
			message: [{ type: "text", text: "retry me" }],
			turnId: "turn-1",
		});
		expect(started.isOk()).toBe(true);
		if (started.isErr()) throw new Error("expected ok");
		expect(started.value.bound).toBeNull();
		expect(
			conversations.some((entry) => entry.event.type === "user_message")
		).toBe(true);

		sessionCreateError = null;
		const rebound = await coordinator.bindAgent(
			started.value.threadId,
			"project-1",
			"mock-agent"
		);
		expect(rebound.isOk()).toBe(true);
		if (rebound.isErr()) throw new Error("expected bind to succeed");

		const persisted = await coordinator.persistBoundSession(
			started.value.threadId,
			"project-1",
			"mock-agent"
		);
		expect(persisted.isOk()).toBe(true);

		const prompt = await coordinator.prompt(
			"mock-agent",
			started.value.threadId,
			"project-1",
			[{ type: "text", text: "retry me" }],
			"turn-retry"
		);
		expect(prompt.isOk()).toBe(true);
		if (prompt.isErr()) throw new Error("expected prompt to succeed");
		for await (const _event of prompt.value) {
			/* drain */
		}
		expect(sessions[0]?.prompt).toHaveBeenCalledWith("retry me");
	});
});
