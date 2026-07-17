import type { RuntimeSession } from "@acp-kit/core";
import type { AvailableCommand } from "@agentclientprotocol/sdk";
import type { BindAgentOutput } from "@cyrus/schemas/rtc/catalog";
import type { AgentEvent, ChatMessage } from "@cyrus/schemas/rtc/chat";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import {
	effortsFromSession,
	modelsFromSession,
	modesFromSession,
	personasFromSession,
} from "./catalog";
import type { CatalogField, CatalogFieldValue } from "./catalog-ops";
import {
	getAgentCapabilities,
	getCatalogField,
	setCatalogField,
} from "./catalog-ops";
import {
	commandsFromSession,
	SessionMetadataStore,
	usageFromSession,
} from "./metadata";
import { runPromptTurn } from "./prompt-turn";
import { ThreadSessionStore } from "./sessions";

export type { CatalogField, CatalogFieldValue } from "./catalog-ops";

export function catalogSnapshotFromSession(
	session: RuntimeSession
): Pick<BindAgentOutput, "models" | "modes" | "efforts" | "personas"> {
	return {
		models: modelsFromSession(session),
		modes: modesFromSession(session),
		efforts: effortsFromSession(session),
		personas: personasFromSession(session),
	};
}

export class AgentRuntime {
	private readonly agentName: string;
	private readonly pool: AgentPool;
	private readonly metadata = new SessionMetadataStore();
	private readonly sessions: ThreadSessionStore;

	constructor(agentName: string, pool: AgentPool) {
		this.agentName = agentName;
		this.pool = pool;
		this.sessions = new ThreadSessionStore(agentName, pool, this.metadata);
	}

	private catalogDeps() {
		return {
			agentName: this.agentName,
			pool: this.pool,
			sessions: this.sessions,
		};
	}

	async getCatalogField<F extends CatalogField>(
		field: F,
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string
	): Promise<CatalogFieldValue[F]> {
		return await getCatalogField(
			this.catalogDeps(),
			field,
			threadId,
			projectId,
			cwd,
			sessionId
		);
	}

	async setCatalogField(
		field: CatalogField,
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string,
		value: string
	): Promise<void> {
		return await setCatalogField(
			this.catalogDeps(),
			field,
			threadId,
			projectId,
			cwd,
			sessionId,
			value
		);
	}

	async getAgentCapabilities(): Promise<Record<string, unknown>> {
		return await getAgentCapabilities(this.catalogDeps());
	}

	getAvailableCommands(threadId: string): AvailableCommand[] {
		return this.metadata.getAvailableCommands(threadId);
	}

	getContextUsage(threadId: string): { used?: number; limit?: number } | null {
		return this.metadata.getContextUsage(threadId);
	}

	commandsFromSession(session: RuntimeSession): AvailableCommand[] {
		return commandsFromSession(session);
	}

	usageFromSession(session: RuntimeSession) {
		return usageFromSession(session);
	}

	async createBoundSession(
		threadId: string,
		projectId: string,
		cwd: string
	): Promise<RuntimeSession> {
		return await this.sessions.createBoundSession(threadId, projectId, cwd);
	}

	/**
	 * Short-lived session at `cwd` to capture a draft catalog preview.
	 * Never attached to a thread; always closed before returning.
	 */
	async probeCatalog(
		cwd: string
	): Promise<
		Pick<
			BindAgentOutput,
			"capabilities" | "models" | "modes" | "efforts" | "personas" | "commands"
		>
	> {
		await this.sessions.ensureHealthyPool();
		const runtime = await this.pool.getRuntime(this.agentName);
		const session = await runtime.newSession({ cwd });
		try {
			return {
				capabilities: runtime.agentCapabilities ?? {},
				...catalogSnapshotFromSession(session),
				commands: commandsFromSession(session),
			};
		} finally {
			await Result.tryPromise(() => session.close());
		}
	}

	async *prompt(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string,
		content: ChatMessage,
		turnId: string
	): AsyncGenerator<AgentEvent> {
		yield* runPromptTurn(
			{
				agentName: this.agentName,
				pool: this.pool,
				sessions: this.sessions,
				metadata: this.metadata,
			},
			threadId,
			projectId,
			cwd,
			sessionId,
			content,
			turnId
		);
	}

	getLiveSession(threadId: string): {
		sessionId: string;
		projectId: string;
		cwd: string;
	} | null {
		return this.sessions.getLiveSession(threadId);
	}

	async cancel(threadId: string): Promise<void> {
		return await this.sessions.cancel(threadId);
	}

	async close(threadId: string): Promise<void> {
		return await this.sessions.close(threadId);
	}

	async closeSession(sessionId: string, threadId?: string): Promise<void> {
		return await this.sessions.closeSession(sessionId, threadId);
	}
}
