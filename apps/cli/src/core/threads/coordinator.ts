import {
	type CoordinatorError,
	coordinatorRuntimeError,
} from "@cyrus/errors/coordinator";
import type { BindAgentOutput, ModelOption } from "@cyrus/schemas/rtc/catalog";
import type { AgentEvent, ChatMessage } from "@cyrus/schemas/rtc/chat";
import type { SelectOption } from "@cyrus/schemas/rtc/common";
import { Mutex } from "async-mutex";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import { AgentRuntime } from "@/core/agents/runtime";
import { bindAgentLocked } from "./bind";
import {
	findLiveBinding,
	persistBoundSessionLocked,
	resolveBoundThread as resolveBoundThreadFn,
	resolveCwd as resolveCwdFn,
} from "./binding";
import {
	getContextUsage,
	getEfforts,
	getModels,
	getModes,
	getPersonas,
	setEffort,
	setMode,
	setModel,
	setPersona,
} from "./catalog";
import {
	type DraftCatalog,
	getDraftCatalog as getDraftCatalogFn,
} from "./draft-catalog";
import {
	cancel as cancelTurn,
	closeAnyThreadSession,
	prompt as promptTurn,
} from "./turn";
import type { BoundThread, CoordinatorHost } from "./types";

export class ThreadCoordinator implements CoordinatorHost {
	private readonly agents = new Map<string, AgentRuntime>();
	private readonly pool: AgentPool;
	private readonly threadMutexes = new Map<string, Mutex>();

	constructor(pool: AgentPool) {
		this.pool = pool;
	}

	private mutexFor(threadId: string): Mutex {
		let mutex = this.threadMutexes.get(threadId);
		if (!mutex) {
			mutex = new Mutex();
			this.threadMutexes.set(threadId, mutex);
		}
		return mutex;
	}

	private withThreadLock<T>(
		threadId: string,
		fn: () => Promise<T>
	): Promise<T> {
		return this.mutexFor(threadId).runExclusive(fn);
	}

	getAgent(agentName: string): AgentRuntime {
		let runtime = this.agents.get(agentName);
		if (!runtime) {
			runtime = new AgentRuntime(agentName, this.pool);
			this.agents.set(agentName, runtime);
		}
		return runtime;
	}

	findLiveBinding(threadId: string): BoundThread | null {
		return findLiveBinding(this.agents, threadId);
	}

	async withRuntime<T>(
		fn: () => Promise<T>
	): Promise<Result<T, CoordinatorError>> {
		return (await Result.tryPromise(fn)).mapError((error) =>
			coordinatorRuntimeError(
				error instanceof Error ? error.message : String(error)
			)
		);
	}

	resolveCwd(threadId: string): Promise<Result<string, CoordinatorError>> {
		return resolveCwdFn(threadId);
	}

	resolveBoundThread(
		threadId: string,
		projectId?: string
	): Promise<Result<BoundThread, CoordinatorError>> {
		return resolveBoundThreadFn(this, threadId, projectId);
	}

	async bindAgent(
		threadId: string,
		projectId: string,
		agentName: string
	): Promise<Result<BindAgentOutput, CoordinatorError>> {
		return await this.withThreadLock(threadId, () =>
			bindAgentLocked(this, threadId, projectId, agentName)
		);
	}

	/** Persist live draft binding on first user message. No-op if already stored. */
	async persistBoundSession(
		threadId: string,
		projectId: string,
		expectedAgentName?: string
	): Promise<Result<BoundThread, CoordinatorError>> {
		return await this.withThreadLock(threadId, () =>
			persistBoundSessionLocked(this, threadId, projectId, expectedAgentName)
		);
	}

	getModels(
		threadId: string
	): Promise<Result<ModelOption[], CoordinatorError>> {
		return getModels(this, threadId);
	}

	getModes(
		threadId: string
	): Promise<Result<SelectOption[], CoordinatorError>> {
		return getModes(this, threadId);
	}

	getEfforts(
		threadId: string
	): Promise<Result<SelectOption[], CoordinatorError>> {
		return getEfforts(this, threadId);
	}

	getPersonas(
		threadId: string
	): Promise<Result<SelectOption[], CoordinatorError>> {
		return getPersonas(this, threadId);
	}

	setModel(
		threadId: string,
		projectId: string,
		modelId: string
	): Promise<Result<void, CoordinatorError>> {
		return setModel(this, threadId, projectId, modelId);
	}

	setMode(
		threadId: string,
		projectId: string,
		modeId: string
	): Promise<Result<void, CoordinatorError>> {
		return setMode(this, threadId, projectId, modeId);
	}

	setEffort(
		threadId: string,
		projectId: string,
		effortId: string
	): Promise<Result<void, CoordinatorError>> {
		return setEffort(this, threadId, projectId, effortId);
	}

	setPersona(
		threadId: string,
		projectId: string,
		personaId: string
	): Promise<Result<void, CoordinatorError>> {
		return setPersona(this, threadId, projectId, personaId);
	}

	getContextUsage(
		threadId: string
	): Promise<
		Result<{ used?: number; limit?: number } | null, CoordinatorError>
	> {
		return getContextUsage(this, threadId);
	}

	getDraftCatalog(
		agentName: string,
		projectId: string
	): Promise<Result<DraftCatalog, CoordinatorError>> {
		return getDraftCatalogFn(this, agentName, projectId);
	}

	prompt(
		agentName: string,
		threadId: string,
		projectId: string,
		content: ChatMessage,
		turnId: string
	): Promise<Result<AsyncGenerator<AgentEvent>, CoordinatorError>> {
		return promptTurn(this, agentName, threadId, projectId, content, turnId);
	}

	cancel(agentName: string, threadId: string): Promise<void> {
		return cancelTurn(this, agentName, threadId);
	}

	async closeThreadSession(
		threadId: string,
		sessionId: string,
		agentName: string
	): Promise<void> {
		await this.withThreadLock(threadId, () =>
			this.getAgent(agentName).closeSession(sessionId, threadId)
		);
	}

	async closeAnyThreadSession(threadId: string): Promise<void> {
		await this.withThreadLock(threadId, () =>
			closeAnyThreadSession(this, threadId)
		);
	}
}
