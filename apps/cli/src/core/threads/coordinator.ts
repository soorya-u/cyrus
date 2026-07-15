import { resolveThreadGitCwd } from "@cyrus/database/repositories/git";
import {
	bindThreadAgent,
	clearThreadDraftBinding,
	getThread,
} from "@cyrus/database/repositories/threads";
import {
	type CoordinatorError,
	coordinatorAgentLocked,
	coordinatorAgentMismatch,
	coordinatorAgentNotBound,
	coordinatorNotFound,
	coordinatorRepositoryError,
	coordinatorRuntimeError,
} from "@cyrus/errors/coordinator";
import type { BindAgentOutput, ModelOption } from "@cyrus/schemas/rtc/catalog";
import type { AgentEvent, ChatMessage } from "@cyrus/schemas/rtc/chat";
import type { SelectOption } from "@cyrus/schemas/rtc/common";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import {
	AgentRuntime,
	catalogSnapshotFromSession,
} from "@/core/agents/runtime";

type BoundThread = {
	threadId: string;
	projectId: string;
	agentName: string;
	sessionId: string;
	cwd: string;
};

export class ThreadCoordinator {
	private readonly agents = new Map<string, AgentRuntime>();
	private readonly pool: AgentPool;

	constructor(pool: AgentPool) {
		this.pool = pool;
	}

	private getAgent(agentName: string): AgentRuntime {
		let runtime = this.agents.get(agentName);
		if (!runtime) {
			runtime = new AgentRuntime(agentName, this.pool);
			this.agents.set(agentName, runtime);
		}
		return runtime;
	}

	private findLiveBinding(threadId: string): BoundThread | null {
		for (const [agentName, runtime] of this.agents) {
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

	private async withRuntime<T>(
		fn: () => Promise<T>
	): Promise<Result<T, CoordinatorError>> {
		return (await Result.tryPromise(fn)).mapError((error) =>
			coordinatorRuntimeError(
				error instanceof Error ? error.message : String(error)
			)
		);
	}

	private async catalogForSession(
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

	async bindAgent(
		threadId: string,
		projectId: string,
		agentName: string
	): Promise<Result<BindAgentOutput, CoordinatorError>> {
		const thread = await getThread(threadId);
		if (thread.isErr())
			return Result.err(coordinatorRepositoryError(thread.error));

		if (!thread.value || thread.value.projectId !== projectId)
			return Result.err(coordinatorNotFound("thread", threadId));

		if (thread.value.agentLocked && thread.value.agentName !== agentName) {
			return Result.err(coordinatorAgentLocked());
		}

		const cwd = await this.resolveCwd(threadId);
		if (cwd.isErr()) return Result.err(cwd.error);

		const runtime = this.getAgent(agentName);
		const live = this.findLiveBinding(threadId);

		if (thread.value.agentLocked) {
			return this.bindLockedThread({
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

		return this.bindDraftThread({
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

	private async bindLockedThread(params: {
		threadId: string;
		projectId: string;
		agentName: string;
		cwd: string;
		runtime: AgentRuntime;
		live: BoundThread | null;
		sessionId: string | undefined;
		agentNameOnThread: string | undefined;
	}): Promise<Result<BindAgentOutput, CoordinatorError>> {
		const sessionId = params.live?.sessionId ?? params.sessionId;
		if (!(sessionId && params.agentNameOnThread)) {
			return Result.err(coordinatorAgentNotBound());
		}

		const catalog = await this.withRuntime(() =>
			this.catalogForSession(
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

	private async bindDraftThread(params: {
		threadId: string;
		projectId: string;
		agentName: string;
		cwd: string;
		runtime: AgentRuntime;
		live: BoundThread | null;
		staleAgentName: string | undefined;
		staleSessionId: string | undefined;
	}): Promise<Result<BindAgentOutput, CoordinatorError>> {
		const { live } = params;

		if (live?.agentName === params.agentName) {
			const catalog = await this.withRuntime(() =>
				this.catalogForSession(
					params.runtime,
					params.threadId,
					params.projectId,
					params.cwd,
					live.sessionId
				)
			);
			if (catalog.isOk()) {
				return Result.ok({
					sessionId: live.sessionId,
					agentName: params.agentName,
					agentLocked: undefined,
					...catalog.value,
					commands: params.runtime.getAvailableCommands(params.threadId),
				});
			}
		}

		if (live) {
			const closed = await this.withRuntime(() =>
				this.getAgent(live.agentName).closeSession(
					live.sessionId,
					params.threadId
				)
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

		const bound = await this.withRuntime(async () => {
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

	/** Persist live draft binding on first user message. No-op if already stored. */
	async persistBoundSession(
		threadId: string,
		projectId: string
	): Promise<Result<BoundThread, CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId, projectId);
		if (bound.isErr()) return Result.err(bound.error);

		const thread = await getThread(threadId);
		if (thread.isErr())
			return Result.err(coordinatorRepositoryError(thread.error));
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

	async getModels(
		threadId: string
	): Promise<Result<ModelOption[], CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId);
		if (bound.isErr()) return Result.err(bound.error);
		return this.withRuntime(() =>
			this.getAgent(bound.value.agentName).getModels(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId
			)
		);
	}

	async getModes(
		threadId: string
	): Promise<Result<SelectOption[], CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId);
		if (bound.isErr()) return Result.err(bound.error);
		return this.withRuntime(() =>
			this.getAgent(bound.value.agentName).getModes(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId
			)
		);
	}

	async getEfforts(
		threadId: string
	): Promise<Result<SelectOption[], CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId);
		if (bound.isErr()) return Result.err(bound.error);
		return this.withRuntime(() =>
			this.getAgent(bound.value.agentName).getEfforts(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId
			)
		);
	}

	async getPersonas(
		threadId: string
	): Promise<Result<SelectOption[], CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId);
		if (bound.isErr()) return Result.err(bound.error);
		return this.withRuntime(() =>
			this.getAgent(bound.value.agentName).getPersonas(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId
			)
		);
	}

	async setModel(
		threadId: string,
		projectId: string,
		modelId: string
	): Promise<Result<void, CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId, projectId);
		if (bound.isErr()) return Result.err(bound.error);
		return this.withRuntime(() =>
			this.getAgent(bound.value.agentName).setModel(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId,
				modelId
			)
		);
	}

	async setMode(
		threadId: string,
		projectId: string,
		modeId: string
	): Promise<Result<void, CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId, projectId);
		if (bound.isErr()) return Result.err(bound.error);
		return this.withRuntime(() =>
			this.getAgent(bound.value.agentName).setMode(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId,
				modeId
			)
		);
	}

	async setEffort(
		threadId: string,
		projectId: string,
		effortId: string
	): Promise<Result<void, CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId, projectId);
		if (bound.isErr()) return Result.err(bound.error);
		return this.withRuntime(() =>
			this.getAgent(bound.value.agentName).setEffort(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId,
				effortId
			)
		);
	}

	async setPersona(
		threadId: string,
		projectId: string,
		personaId: string
	): Promise<Result<void, CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId, projectId);
		if (bound.isErr()) return Result.err(bound.error);
		return this.withRuntime(() =>
			this.getAgent(bound.value.agentName).setPersona(
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId,
				personaId
			)
		);
	}

	async getContextUsage(
		threadId: string
	): Promise<
		Result<{ used?: number; limit?: number } | null, CoordinatorError>
	> {
		const bound = await this.resolveBoundThread(threadId);
		if (bound.isErr()) return Result.err(bound.error);
		return Result.ok(
			this.getAgent(bound.value.agentName).getContextUsage(threadId)
		);
	}

	async prompt(
		agentName: string,
		threadId: string,
		projectId: string,
		content: ChatMessage
	): Promise<Result<AsyncGenerator<AgentEvent>, CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId, projectId);
		if (bound.isErr()) return Result.err(bound.error);
		if (bound.value.agentName !== agentName) {
			return Result.err(
				coordinatorAgentMismatch(bound.value.agentName, agentName)
			);
		}
		return Result.ok(
			this.getAgent(agentName).prompt(
				threadId,
				projectId,
				bound.value.cwd,
				bound.value.sessionId,
				content
			)
		);
	}

	async cancel(agentName: string, threadId: string): Promise<void> {
		await this.getAgent(agentName).cancel(threadId);
	}

	async closeThreadSession(
		threadId: string,
		sessionId: string,
		agentName: string
	): Promise<void> {
		await this.getAgent(agentName).closeSession(sessionId, threadId);
	}

	async closeAnyThreadSession(threadId: string): Promise<void> {
		const live = this.findLiveBinding(threadId);
		if (live) {
			await this.getAgent(live.agentName).closeSession(
				live.sessionId,
				threadId
			);
			return;
		}

		const thread = await getThread(threadId);
		if (thread.isErr() || !thread.value) return;
		if (!(thread.value.sessionId && thread.value.agentName)) return;
		await this.getAgent(thread.value.agentName).closeSession(
			thread.value.sessionId,
			threadId
		);
	}

	private async resolveCwd(
		threadId: string
	): Promise<Result<string, CoordinatorError>> {
		const result = await resolveThreadGitCwd(threadId);
		if (result.isErr())
			return Result.err(coordinatorRepositoryError(result.error));
		return Result.ok(result.value);
	}

	private async resolveBoundThread(
		threadId: string,
		projectId?: string
	): Promise<Result<BoundThread, CoordinatorError>> {
		const live = this.findLiveBinding(threadId);
		if (live) {
			if (projectId && live.projectId !== projectId) {
				return Result.err(coordinatorNotFound("thread", threadId));
			}
			return Result.ok(live);
		}

		const thread = await getThread(threadId);
		if (thread.isErr())
			return Result.err(coordinatorRepositoryError(thread.error));
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

		const cwd = await this.resolveCwd(threadId);
		if (cwd.isErr()) return Result.err(cwd.error);

		return Result.ok({
			threadId,
			projectId: thread.value.projectId,
			agentName: thread.value.agentName,
			sessionId: thread.value.sessionId,
			cwd: cwd.value,
		});
	}
}
