import { resolveProjectCwd } from "@cyrus/database/repositories/projects";
import {
	bindThreadAgent,
	getThread,
} from "@cyrus/database/repositories/threads";
import type { BindAgentOutput, ModelOption } from "@cyrus/schemas/rtc/catalog";
import type { AgentEvent } from "@cyrus/schemas/rtc/chat";
import type { SelectOption } from "@cyrus/schemas/rtc/common";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import {
	AgentRuntime,
	catalogSnapshotFromSession,
} from "@/core/agents/runtime";
import {
	type CoordinatorError,
	coordinatorAgentLocked,
	coordinatorAgentMismatch,
	coordinatorAgentNotBound,
	coordinatorNotFound,
	coordinatorRepositoryError,
} from "@/errors/coordinator";

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

	async bindAgent(
		threadId: string,
		projectId: string,
		agentName: string
	): Promise<Result<BindAgentOutput, CoordinatorError>> {
		const thread = await getThread(threadId);
		if (thread.isErr())
			return Result.err(coordinatorRepositoryError(thread.error));
		if (!thread.value || thread.value.projectId !== projectId) {
			return Result.err(coordinatorNotFound("thread", threadId));
		}

		if (thread.value.agentLocked && thread.value.agentName !== agentName) {
			return Result.err(coordinatorAgentLocked());
		}

		const cwd = await this.resolveCwd(projectId);
		if (cwd.isErr()) return Result.err(cwd.error);

		const runtime = this.getAgent(agentName);

		if (thread.value.agentName === agentName && thread.value.sessionId) {
			return Result.ok({
				sessionId: thread.value.sessionId,
				agentName,
				agentLocked: thread.value.agentLocked,
				models: await runtime.getModels(
					threadId,
					projectId,
					cwd.value,
					thread.value.sessionId
				),
				modes: await runtime.getModes(
					threadId,
					projectId,
					cwd.value,
					thread.value.sessionId
				),
				efforts: await runtime.getEfforts(
					threadId,
					projectId,
					cwd.value,
					thread.value.sessionId
				),
				personas: await runtime.getPersonas(
					threadId,
					projectId,
					cwd.value,
					thread.value.sessionId
				),
			});
		}

		if (
			thread.value.sessionId &&
			thread.value.agentName &&
			thread.value.agentName !== agentName
		) {
			await this.getAgent(thread.value.agentName).closeSession(
				thread.value.sessionId,
				threadId
			);
		}

		const session = await runtime.createBoundSession(
			threadId,
			projectId,
			cwd.value
		);
		const persisted = await bindThreadAgent(threadId, projectId, {
			agentName,
			sessionId: session.sessionId,
		});
		if (persisted.isErr()) {
			await runtime.closeSession(session.sessionId, threadId);
			return Result.err(coordinatorRepositoryError(persisted.error));
		}

		return Result.ok({
			sessionId: session.sessionId,
			agentName,
			agentLocked: persisted.value.agentLocked,
			...catalogSnapshotFromSession(session),
		});
	}

	async getModels(
		threadId: string
	): Promise<Result<ModelOption[], CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId);
		if (bound.isErr()) return Result.err(bound.error);
		return Result.ok(
			await this.getAgent(bound.value.agentName).getModels(
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
		return Result.ok(
			await this.getAgent(bound.value.agentName).getModes(
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
		return Result.ok(
			await this.getAgent(bound.value.agentName).getEfforts(
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
		return Result.ok(
			await this.getAgent(bound.value.agentName).getPersonas(
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
		await this.getAgent(bound.value.agentName).setModel(
			bound.value.threadId,
			bound.value.projectId,
			bound.value.cwd,
			bound.value.sessionId,
			modelId
		);
		return Result.ok(undefined);
	}

	async setMode(
		threadId: string,
		projectId: string,
		modeId: string
	): Promise<Result<void, CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId, projectId);
		if (bound.isErr()) return Result.err(bound.error);
		await this.getAgent(bound.value.agentName).setMode(
			bound.value.threadId,
			bound.value.projectId,
			bound.value.cwd,
			bound.value.sessionId,
			modeId
		);
		return Result.ok(undefined);
	}

	async setEffort(
		threadId: string,
		projectId: string,
		effortId: string
	): Promise<Result<void, CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId, projectId);
		if (bound.isErr()) return Result.err(bound.error);
		await this.getAgent(bound.value.agentName).setEffort(
			bound.value.threadId,
			bound.value.projectId,
			bound.value.cwd,
			bound.value.sessionId,
			effortId
		);
		return Result.ok(undefined);
	}

	async setPersona(
		threadId: string,
		projectId: string,
		personaId: string
	): Promise<Result<void, CoordinatorError>> {
		const bound = await this.resolveBoundThread(threadId, projectId);
		if (bound.isErr()) return Result.err(bound.error);
		await this.getAgent(bound.value.agentName).setPersona(
			bound.value.threadId,
			bound.value.projectId,
			bound.value.cwd,
			bound.value.sessionId,
			personaId
		);
		return Result.ok(undefined);
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
		projectId: string
	): Promise<Result<string, CoordinatorError>> {
		const result = await resolveProjectCwd(projectId);
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

		const cwd = await this.resolveCwd(thread.value.projectId);
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
