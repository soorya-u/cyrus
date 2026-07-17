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
import type { CatalogField } from "@/core/agents/runtime";
import { AgentRuntime } from "@/core/agents/runtime";
import { bindAgentLocked } from "./bind";
import {
	findLiveBinding,
	persistBoundSessionLocked,
	resolveBoundThread as resolveBoundThreadFn,
	resolveCwd as resolveCwdFn,
} from "./binding";
import {
	cancel as cancelTurn,
	closeAnyThreadSession,
	prompt as promptTurn,
} from "./turn";
import type { BoundThread, CoordinatorHost } from "./types";

export type { CatalogField } from "@/core/agents/runtime";

type CatalogGetOp = { type: "get" };
type CatalogSetOp = { type: "set"; projectId: string; value: string };
type CatalogOp = CatalogGetOp | CatalogSetOp;

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

	catalog(
		threadId: string,
		field: "model",
		op: CatalogGetOp
	): Promise<Result<ModelOption[], CoordinatorError>>;
	catalog(
		threadId: string,
		field: "mode" | "effort" | "persona",
		op: CatalogGetOp
	): Promise<Result<SelectOption[], CoordinatorError>>;
	catalog(
		threadId: string,
		field: CatalogField,
		op: CatalogSetOp
	): Promise<Result<undefined, CoordinatorError>>;
	async catalog(
		threadId: string,
		field: CatalogField,
		op: CatalogOp
	): Promise<
		Result<ModelOption[] | SelectOption[] | undefined, CoordinatorError>
	> {
		if (op.type === "set") {
			return await this.withThreadLock(threadId, () =>
				this.runCatalog(threadId, field, op)
			);
		}
		return await this.runCatalog(threadId, field, op);
	}

	private async runCatalog(
		threadId: string,
		field: CatalogField,
		op: CatalogOp
	): Promise<
		Result<ModelOption[] | SelectOption[] | undefined, CoordinatorError>
	> {
		const bound = await this.resolveBoundThread(
			threadId,
			op.type === "set" ? op.projectId : undefined
		);
		if (bound.isErr()) return Result.err(bound.error);

		if (op.type === "get") {
			return this.withRuntime(() =>
				this.getAgent(bound.value.agentName).getCatalogField(
					field,
					bound.value.threadId,
					bound.value.projectId,
					bound.value.cwd,
					bound.value.sessionId
				)
			);
		}

		const setResult = await this.withRuntime(() =>
			this.getAgent(bound.value.agentName).setCatalogField(
				field,
				bound.value.threadId,
				bound.value.projectId,
				bound.value.cwd,
				bound.value.sessionId,
				op.value
			)
		);
		if (setResult.isErr()) return Result.err(setResult.error);
		return Result.ok(undefined);
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
