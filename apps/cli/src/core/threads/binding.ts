import { resolveThreadGitCwd } from "@cyrus/database/repositories/git";
import {
	bindThreadAgent,
	getThread,
	setAgentLocked,
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

export async function resolveCwd(
	threadId: string
): Promise<Result<string, CoordinatorError>> {
	const result = await resolveThreadGitCwd(threadId);
	if (result.isErr())
		return Result.err(coordinatorRepositoryError(result.error));

	return Result.ok(result.value);
}

/** Resolve a thread's session: live if present, otherwise cold from DB. */
export async function resolveBoundThread(
	host: Pick<CoordinatorHost, "findLiveBinding" | "resolveCwd">,
	threadId: string,
	projectId?: string
): Promise<Result<BoundThread, CoordinatorError>> {
	const live = host.findLiveBinding(threadId);
	if (live) {
		if (projectId && live.projectId !== projectId)
			return Result.err(coordinatorNotFound("thread", threadId));

		return Result.ok(live);
	}

	const thread = await getThread(threadId);
	if (thread.isErr())
		return Result.err(coordinatorRepositoryError(thread.error));

	if (!thread.value) return Result.err(coordinatorNotFound("thread", threadId));

	if (projectId && thread.value.projectId !== projectId)
		return Result.err(coordinatorNotFound("thread", threadId));

	// Cold: resume from the persisted session id when an operation needs one.
	if (
		!(
			thread.value.agentLocked &&
			thread.value.sessionId &&
			thread.value.agentName
		)
	)
		return Result.err(coordinatorAgentNotBound());

	const cwd = await host.resolveCwd(threadId);
	if (cwd.isErr()) return Result.err(cwd.error);

	return Result.ok({
		threadId,
		projectId: thread.value.projectId,
		agentName: thread.value.agentName,
		sessionId: thread.value.sessionId,
		cwd: cwd.value,
	});
}

/**
 * Ensure a thread has a live or cold session for chat.
 * Live/cold threads are returned as-is; unbound threads (e.g. after a
 * mid-flight startThread failure) get a new session created and locked.
 */
export async function ensureSessionLocked(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	agentName: string
): Promise<Result<BoundThread, CoordinatorError>> {
	const live = host.findLiveBinding(threadId);
	if (live) {
		if (live.projectId !== projectId)
			return Result.err(coordinatorNotFound("thread", threadId));

		if (live.agentName !== agentName)
			return Result.err(coordinatorAgentMismatch(live.agentName, agentName));

		return Result.ok(live);
	}

	const thread = await getThread(threadId);
	if (thread.isErr())
		return Result.err(coordinatorRepositoryError(thread.error));

	if (!thread.value || thread.value.projectId !== projectId)
		return Result.err(coordinatorNotFound("thread", threadId));

	if (thread.value.agentLocked) {
		if (thread.value.agentName !== agentName)
			return Result.err(coordinatorAgentLocked());

		if (!(thread.value.sessionId && thread.value.agentName))
			return Result.err(coordinatorAgentNotBound());

		const cwd = await host.resolveCwd(threadId);
		if (cwd.isErr()) return Result.err(cwd.error);
		return Result.ok({
			threadId,
			projectId,
			agentName: thread.value.agentName,
			sessionId: thread.value.sessionId,
			cwd: cwd.value,
		});
	}

	const cwd = await host.resolveCwd(threadId);
	if (cwd.isErr()) return Result.err(cwd.error);

	const session = await host.withRuntime(() =>
		host.getAgent(agentName).createBoundSession(threadId, projectId, cwd.value)
	);
	if (session.isErr()) return Result.err(session.error);

	const persisted = await bindThreadAgent(threadId, projectId, {
		agentName,
		sessionId: session.value.sessionId,
	});
	if (persisted.isErr())
		return Result.err(coordinatorRepositoryError(persisted.error));

	const locked = await setAgentLocked(threadId);
	if (locked.isErr())
		return Result.err(coordinatorRepositoryError(locked.error));

	return Result.ok({
		threadId,
		projectId,
		agentName,
		sessionId: session.value.sessionId,
		cwd: cwd.value,
	});
}
