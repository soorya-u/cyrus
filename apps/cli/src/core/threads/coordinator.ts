import { resolveThreadGitCwd } from "@cyrus/database/repositories/git";
import {
	bindThreadAgent,
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
import type { AgentEvent } from "@cyrus/schemas/rtc/chat";
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

	private async withRuntime<T>(
		fn: () => Promise<T>
	): Promise<Result<T, CoordinatorError>> {
		return (await Result.tryPromise(fn)).mapError((error) =>
			coordinatorRuntimeError(
				error instanceof Error ? error.message : String(error)
			)
		);
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

		if (thread.value.agentName === agentName && thread.value.sessionId) {
			const sessionId = thread.value.sessionId;
			const catalog = await this.withRuntime(async () => ({
				capabilities: await runtime.getAgentCapabilities(),
				models: await runtime.getModels(
					threadId,
					projectId,
					cwd.value,
					sessionId
				),
				modes: await runtime.getModes(
					threadId,
					projectId,
					cwd.value,
					sessionId
				),
				efforts: await runtime.getEfforts(
					threadId,
					projectId,
					cwd.value,
					sessionId
				),
				personas: await runtime.getPersonas(
					threadId,
					projectId,
					cwd.value,
					sessionId
				),
			}));
			if (catalog.isErr()) return Result.err(catalog.error);

			return Result.ok({
				sessionId,
				agentName,
				agentLocked: thread.value.agentLocked,
				...catalog.value,
			});
		}

		const previousAgentName = thread.value.agentName;
		const previousSessionId = thread.value.sessionId;
		if (
			previousSessionId &&
			previousAgentName &&
			previousAgentName !== agentName
		) {
			const closed = await this.withRuntime(() =>
				this.getAgent(previousAgentName).closeSession(
					previousSessionId,
					threadId
				)
			);
			if (closed.isErr()) return Result.err(closed.error);
		}

		const bound = await this.withRuntime(async () => {
			const session = await runtime.createBoundSession(
				threadId,
				projectId,
				cwd.value
			);
			return {
				session,
				capabilities: await runtime.getAgentCapabilities(),
				...catalogSnapshotFromSession(session),
			};
		});
		if (bound.isErr()) return Result.err(bound.error);

		const persisted = await bindThreadAgent(threadId, projectId, {
			agentName,
			sessionId: bound.value.session.sessionId,
		});
		if (persisted.isErr()) {
			await runtime.closeSession(bound.value.session.sessionId, threadId);
			return Result.err(coordinatorRepositoryError(persisted.error));
		}

		return Result.ok({
			sessionId: bound.value.session.sessionId,
			agentName,
			agentLocked: persisted.value.agentLocked,
			capabilities: bound.value.capabilities,
			models: bound.value.models,
			modes: bound.value.modes,
			efforts: bound.value.efforts,
			personas: bound.value.personas,
		});
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

	async prompt(
		agentName: string,
		threadId: string,
		projectId: string,
		content: string
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
		const thread = await getThread(threadId);
		if (thread.isErr())
			return Result.err(coordinatorRepositoryError(thread.error));
		if (!thread.value) {
			return Result.err(coordinatorNotFound("thread", threadId));
		}
		if (projectId && thread.value.projectId !== projectId) {
			return Result.err(coordinatorNotFound("thread", threadId));
		}
		if (!(thread.value.sessionId && thread.value.agentName)) {
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
