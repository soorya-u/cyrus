import {
	clearThreadDraftBinding,
	getThread,
} from "@cyrus/database/repositories/threads";
import {
	type CoordinatorError,
	coordinatorAgentLocked,
	coordinatorAgentNotBound,
	coordinatorNotFound,
	coordinatorRepositoryError,
} from "@cyrus/errors/coordinator";
import type { BindAgentOutput, ModelOption } from "@cyrus/schemas/rtc/catalog";
import type { SelectOption } from "@cyrus/schemas/rtc/common";
import { Result } from "better-result";
import {
	type AgentRuntime,
	catalogSnapshotFromSession,
} from "@/core/agents/runtime";
import type { BoundThread, CoordinatorHost } from "./types";

async function catalogForSession(
	runtime: AgentRuntime,
	threadId: string,
	projectId: string,
	cwd: string,
	sessionId: string
): Promise<{
	capabilities: Record<string, unknown>;
	models: ModelOption[];
	modes: SelectOption[];
	efforts: SelectOption[];
	personas: SelectOption[];
}> {
	return {
		capabilities: await runtime.getAgentCapabilities(),
		models: await runtime.getModels(threadId, projectId, cwd, sessionId),
		modes: await runtime.getModes(threadId, projectId, cwd, sessionId),
		efforts: await runtime.getEfforts(threadId, projectId, cwd, sessionId),
		personas: await runtime.getPersonas(threadId, projectId, cwd, sessionId),
	};
}

export async function bindAgentLocked(
	host: CoordinatorHost,
	threadId: string,
	projectId: string,
	agentName: string
): Promise<Result<BindAgentOutput, CoordinatorError>> {
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

	const cwd = await host.resolveCwd(threadId);
	if (cwd.isErr()) return Result.err(cwd.error);

	const runtime = host.getAgent(agentName);
	const live = host.findLiveBinding(threadId);

	if (thread.value.agentLocked) {
		return bindLockedThread(host, {
			threadId,
			projectId,
			agentName,
			cwd: cwd.value,
			runtime,
			live,
			sessionId: thread.value.sessionId,
			agentNameOnThread: thread.value.agentName,
		});
	}

	return bindDraftThread(host, {
		threadId,
		projectId,
		agentName,
		cwd: cwd.value,
		runtime,
		live,
		staleAgentName: thread.value.agentName,
		staleSessionId: thread.value.sessionId,
	});
}

async function bindLockedThread(
	host: CoordinatorHost,
	params: {
		threadId: string;
		projectId: string;
		agentName: string;
		cwd: string;
		runtime: AgentRuntime;
		live: BoundThread | null;
		sessionId: string | undefined;
		agentNameOnThread: string | undefined;
	}
): Promise<Result<BindAgentOutput, CoordinatorError>> {
	const sessionId = params.live?.sessionId ?? params.sessionId;
	if (!(sessionId && params.agentNameOnThread)) {
		return Result.err(coordinatorAgentNotBound());
	}

	const catalog = await host.withRuntime(() =>
		catalogForSession(
			params.runtime,
			params.threadId,
			params.projectId,
			params.cwd,
			sessionId
		)
	);
	if (catalog.isErr()) return Result.err(catalog.error);

	return Result.ok({
		sessionId,
		agentName: params.agentName,
		agentLocked: true,
		...catalog.value,
		commands: params.runtime.getAvailableCommands(params.threadId),
	});
}

async function bindDraftThread(
	host: CoordinatorHost,
	params: {
		threadId: string;
		projectId: string;
		agentName: string;
		cwd: string;
		runtime: AgentRuntime;
		live: BoundThread | null;
		staleAgentName: string | undefined;
		staleSessionId: string | undefined;
	}
): Promise<Result<BindAgentOutput, CoordinatorError>> {
	const { live } = params;

	if (live?.agentName === params.agentName) {
		const catalog = await host.withRuntime(() =>
			catalogForSession(
				params.runtime,
				params.threadId,
				params.projectId,
				params.cwd,
				live.sessionId
			)
		);
		if (catalog.isOk())
			return Result.ok({
				sessionId: live.sessionId,
				agentName: params.agentName,
				agentLocked: undefined,
				...catalog.value,
				commands: params.runtime.getAvailableCommands(params.threadId),
			});
	}

	if (live) {
		const closed = await host.withRuntime(() =>
			host
				.getAgent(live.agentName)
				.closeSession(live.sessionId, params.threadId)
		);
		if (closed.isErr()) return Result.err(closed.error);
	}

	if (params.staleAgentName || params.staleSessionId) {
		const cleared = await clearThreadDraftBinding(
			params.threadId,
			params.projectId
		);
		if (cleared.isErr())
			return Result.err(coordinatorRepositoryError(cleared.error));
	}

	const bound = await host.withRuntime(async () => {
		const session = await params.runtime.createBoundSession(
			params.threadId,
			params.projectId,
			params.cwd
		);
		return {
			session,
			capabilities: await params.runtime.getAgentCapabilities(),
			...catalogSnapshotFromSession(session),
		};
	});
	if (bound.isErr()) return Result.err(bound.error);

	return Result.ok({
		sessionId: bound.value.session.sessionId,
		agentName: params.agentName,
		agentLocked: undefined,
		capabilities: bound.value.capabilities,
		models: bound.value.models,
		modes: bound.value.modes,
		efforts: bound.value.efforts,
		personas: bound.value.personas,
		commands: params.runtime.commandsFromSession(bound.value.session),
	});
}
