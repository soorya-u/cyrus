import { resolveThreadGitCwd } from "@cyrus/database/repositories/git";
import {
	bindAndLockThreadAgent,
	getThread,
} from "@cyrus/database/repositories/threads";
import {
	type CoordinatorError,
	coordinatorAgentLocked,
	coordinatorAgentMismatch,
	coordinatorAgentNotBound,
	coordinatorNotFound,
	coordinatorRepositoryError,
} from "@cyrus/errors/coordinator";
import { Result } from "better-result";
import type { AgentRuntime } from "@/core/agents/runtime";
import type { BoundThread, CoordinatorHost } from "./types";

/** Session presence on the worker: live in memory, or cold (persisted id only). */
export type SessionBindingState = "live" | "cold" | "unbound";

export function findLiveBinding(
	agents: Map<string, AgentRuntime>,
	threadId: string
): BoundThread | null {
	for (const [agentName, runtime] of agents) {
		const live = runtime.getLiveSession(threadId);
		if (!live) continue;
		return {
			threadId,
			agentName,
			sessionId: live.sessionId,
			projectId: live.projectId,
			cwd: live.cwd,
		};
	}
	return null;
}

/**
 * Two-arm session predicate for a thread: live if the ACP session is in
 * memory, cold if only a persisted session id exists, unbound otherwise.
 */
export async function sessionBindingState(
	host: Pick<CoordinatorHost, "findLiveBinding">,
	threadId: string
): Promise<Result<SessionBindingState, CoordinatorError>> {
	if (host.findLiveBinding(threadId)) return Result.ok("live");

	const thread = await getThread(threadId);
	if (thread.isErr()) {
		return Result.err(coordinatorRepositoryError(thread.error));
	}
	if (!thread.value) return Result.err(coordinatorNotFound("thread", threadId));

	if (
		thread.value.agentLocked &&
		thread.value.sessionId &&
		thread.value.agentName
	) {
		return Result.ok("cold");
	}
	return Result.ok("unbound");
}

export async function resolveCwd(
	threadId: string
): Promise<Result<string, CoordinatorError>> {
	const result = await resolveThreadGitCwd(threadId);
	if (result.isErr()) {
		return Result.err(coordinatorRepositoryError(result.error));
	}
	return Result.ok(result.value);
}

async function coldBoundFromThread(
	host: Pick<CoordinatorHost, "resolveCwd">,
	threadId: string,
	projectId: string,
	agentName: string,
	sessionId: string
): Promise<Result<BoundThread, CoordinatorError>> {
	const cwd = await host.resolveCwd(threadId);
	if (cwd.isErr()) return Result.err(cwd.error);
	return Result.ok({
		threadId,
		projectId,
		agentName,
		sessionId,
		cwd: cwd.value,
	});
}

/** Resolve a thread's session: live if present, otherwise cold from DB. */
export async function resolveBoundThread(
	host: Pick<CoordinatorHost, "findLiveBinding" | "resolveCwd">,
	threadId: string,
	projectId?: string
): Promise<Result<BoundThread, CoordinatorError>> {
	const live = host.findLiveBinding(threadId);
	if (live) {
		if (projectId && live.projectId !== projectId) {
			return Result.err(coordinatorNotFound("thread", threadId));
		}
		return Result.ok(live);
	}

	const thread = await getThread(threadId);
	if (thread.isErr()) {
		return Result.err(coordinatorRepositoryError(thread.error));
	}
	if (!thread.value) {
		return Result.err(coordinatorNotFound("thread", threadId));
	}
	if (projectId && thread.value.projectId !== projectId) {
		return Result.err(coordinatorNotFound("thread", threadId));
	}

	if (
		!(
			thread.value.agentLocked &&
			thread.value.sessionId &&
			thread.value.agentName
		)
	) {
		return Result.err(coordinatorAgentNotBound());
	}

	return coldBoundFromThread(
		host,
		threadId,
		thread.value.projectId,
		thread.value.agentName,
		thread.value.sessionId
	);
}

async function resumeColdBinding(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	agentName: string,
	sessionId: string
): Promise<Result<BoundThread, CoordinatorError>> {
	const cold = await coldBoundFromThread(
		host,
		threadId,
		projectId,
		agentName,
		sessionId
	);
	if (cold.isErr()) return Result.err(cold.error);

	const resumed = await host.withRuntime(() =>
		host
			.getAgent(agentName)
			.resumeBoundSession(threadId, projectId, cold.value.cwd, sessionId)
	);
	if (resumed.isErr()) return Result.err(resumed.error);

	return Result.ok({
		...cold.value,
		sessionId: resumed.value.sessionId,
	});
}

async function createAndPersistBinding(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	agentName: string
): Promise<Result<BoundThread, CoordinatorError>> {
	const cwd = await host.resolveCwd(threadId);
	if (cwd.isErr()) return Result.err(cwd.error);

	const session = await host.withRuntime(() =>
		host.getAgent(agentName).createBoundSession(threadId, projectId, cwd.value)
	);
	if (session.isErr()) return Result.err(session.error);

	const persisted = await bindAndLockThreadAgent(threadId, projectId, {
		agentName,
		sessionId: session.value.sessionId,
	});
	if (persisted.isErr()) {
		await host.withRuntime(() =>
			host.getAgent(agentName).closeSession(session.value.sessionId, threadId)
		);
		return Result.err(coordinatorRepositoryError(persisted.error));
	}

	return Result.ok({
		threadId,
		projectId,
		agentName,
		sessionId: session.value.sessionId,
		cwd: cwd.value,
	});
}

/**
 * Bind: make a thread's session live — resume a cold persisted session, or
 * create and lock one when the thread has an agent but no session yet (e.g.
 * mid-flight startThread failure).
 */
export async function bindLocked(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	agentName: string
): Promise<Result<BoundThread, CoordinatorError>> {
	const live = host.findLiveBinding(threadId);
	if (live) {
		if (live.projectId !== projectId) {
			return Result.err(coordinatorNotFound("thread", threadId));
		}
		if (live.agentName !== agentName) {
			return Result.err(coordinatorAgentMismatch(live.agentName, agentName));
		}
		return Result.ok(live);
	}

	const thread = await getThread(threadId);
	if (thread.isErr()) {
		return Result.err(coordinatorRepositoryError(thread.error));
	}
	if (!thread.value || thread.value.projectId !== projectId) {
		return Result.err(coordinatorNotFound("thread", threadId));
	}

	if (thread.value.agentLocked && thread.value.agentName !== agentName) {
		return Result.err(coordinatorAgentLocked());
	}

	if (
		thread.value.agentLocked &&
		thread.value.sessionId &&
		thread.value.agentName
	) {
		return resumeColdBinding(
			host,
			threadId,
			projectId,
			thread.value.agentName,
			thread.value.sessionId
		);
	}

	return createAndPersistBinding(host, threadId, projectId, agentName);
}
