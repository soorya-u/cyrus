import { resolveThreadGitCwd } from "@cyrus/database/repositories/git";
import {
	bindThreadAgent,
	getThread,
} from "@cyrus/database/repositories/threads";
import {
	type CoordinatorError,
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
	if (result.isErr()) {
		return Result.err(coordinatorRepositoryError(result.error));
	}
	return Result.ok(result.value);
}

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

	// Only resume sessions that were committed by a first user message.
	if (
		!(
			thread.value.agentLocked &&
			thread.value.sessionId &&
			thread.value.agentName
		)
	) {
		return Result.err(coordinatorAgentNotBound());
	}

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

export async function persistBoundSessionLocked(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	expectedAgentName?: string
): Promise<Result<BoundThread, CoordinatorError>> {
	const bound = await host.resolveBoundThread(threadId, projectId);
	if (bound.isErr()) return Result.err(bound.error);

	if (expectedAgentName && bound.value.agentName !== expectedAgentName) {
		return Result.err(
			coordinatorAgentMismatch(bound.value.agentName, expectedAgentName)
		);
	}

	const thread = await getThread(threadId);
	if (thread.isErr()) {
		return Result.err(coordinatorRepositoryError(thread.error));
	}
	if (!thread.value || thread.value.projectId !== projectId) {
		return Result.err(coordinatorNotFound("thread", threadId));
	}

	if (
		thread.value.agentName === bound.value.agentName &&
		thread.value.sessionId === bound.value.sessionId
	) {
		return Result.ok(bound.value);
	}

	const persisted = await bindThreadAgent(threadId, projectId, {
		agentName: bound.value.agentName,
		sessionId: bound.value.sessionId,
	});
	if (persisted.isErr()) {
		return Result.err(coordinatorRepositoryError(persisted.error));
	}

	return Result.ok(bound.value);
}
