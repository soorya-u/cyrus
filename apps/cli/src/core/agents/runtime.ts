import { openOrCreateRuntimeSession, type RuntimeSession } from "@acp-kit/core";
import type { AvailableCommand } from "@agentclientprotocol/sdk";
import type { BindAgentOutput, ModelOption } from "@cyrus/schemas/rtc/catalog";
import type { AgentEvent, ChatMessage } from "@cyrus/schemas/rtc/chat";
import type { SelectOption } from "@cyrus/schemas/rtc/common";
import { Result } from "better-result";
import { setSessionConfigOption } from "@/core/acp/config";
import type { AgentPool } from "@/core/acp/pool";
import { mapRuntimeSessionEvent } from "../acp/events";
import {
	effortsFromSession,
	findSelectConfigOptionId,
	modelsFromSession,
	modesFromSession,
	personasFromSession,
} from "./catalog";
import { mapPromptBlocksToAcp } from "./prompt";

type ThreadSession = {
	session: RuntimeSession;
	projectId: string;
	cwd: string;
};

type ThreadSessionMetadata = {
	commands: AvailableCommand[];
	usage: {
		used?: number;
		limit?: number;
	};
};

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
	private readonly sessions = new Map<string, ThreadSession>();
	private readonly pendingSessions = new Map<string, Promise<RuntimeSession>>();
	private readonly metadataByThread = new Map<string, ThreadSessionMetadata>();
	private readonly sessionUnsubs = new Map<string, () => void>();

	constructor(agentName: string, pool: AgentPool) {
		this.agentName = agentName;
		this.pool = pool;
	}

	async getModels(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string
	): Promise<ModelOption[]> {
		await this.ensureHealthyPool();
		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		return modelsFromSession(session);
	}

	async getModes(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string
	): Promise<SelectOption[]> {
		await this.ensureHealthyPool();
		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		return modesFromSession(session);
	}

	async getEfforts(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string
	): Promise<SelectOption[]> {
		await this.ensureHealthyPool();
		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		return effortsFromSession(session);
	}

	async getPersonas(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string
	): Promise<SelectOption[]> {
		await this.ensureHealthyPool();
		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		return personasFromSession(session);
	}

	async getAgentCapabilities(): Promise<Record<string, unknown>> {
		await this.ensureHealthyPool();
		const runtime = await this.pool.getRuntime(this.agentName);
		return runtime.agentCapabilities ?? {};
	}

	getAvailableCommands(threadId: string): AvailableCommand[] {
		return this.metadataByThread.get(threadId)?.commands ?? [];
	}

	getContextUsage(threadId: string): { used?: number; limit?: number } | null {
		const usage = this.metadataByThread.get(threadId)?.usage;
		if (!usage || (usage.used === undefined && usage.limit === undefined))
			return null;

		return usage;
	}

	commandsFromSession(session: RuntimeSession): AvailableCommand[] {
		return session.transcript.session.commands ?? [];
	}

	usageFromSession(session: RuntimeSession): ThreadSessionMetadata["usage"] {
		const usage = session.transcript.session.usage ?? {};
		return {
			used: usage.used ?? usage.totalTokens,
			limit: usage.size,
		};
	}

	async createBoundSession(
		threadId: string,
		projectId: string,
		cwd: string
	): Promise<RuntimeSession> {
		await this.ensureHealthyPool();
		await this.close(threadId);

		const runtime = await this.pool.getRuntime(this.agentName);
		const session = await runtime.newSession({ cwd });
		this.sessions.set(threadId, { session, projectId, cwd });
		this.attachSessionMetadata(threadId, session);
		return session;
	}

	async setModel(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string,
		modelId: string
	): Promise<void> {
		await this.ensureHealthyPool();
		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		await session.setModel(modelId);
	}

	async setMode(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string,
		modeId: string
	): Promise<void> {
		await this.ensureHealthyPool();
		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		await session.setMode(modeId);
	}

	async setEffort(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string,
		effortId: string
	): Promise<void> {
		await this.setConfigOptionByCategory(
			threadId,
			projectId,
			cwd,
			sessionId,
			"thought_level",
			effortId
		);
	}

	async setPersona(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string,
		personaId: string
	): Promise<void> {
		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		const configId =
			findSelectConfigOptionId(
				session.transcript.session.configOptions,
				"persona"
			) ??
			session.transcript.session.configOptions.find(
				(option) =>
					option.type === "select" &&
					(option.category?.includes("persona") ||
						option.id.toLowerCase().includes("persona"))
			)?.id;

		if (!configId)
			throw new Error(
				`agent ${this.agentName} does not expose persona options`
			);

		await this.setConfigOption(
			threadId,
			projectId,
			cwd,
			sessionId,
			configId,
			personaId
		);
	}

	async *prompt(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string,
		content: ChatMessage
	): AsyncGenerator<AgentEvent> {
		await this.ensureHealthyPool();

		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		const blocks = content;
		const queue: AgentEvent[] = [];
		let wake: (() => void) | undefined;

		const unsub = session.on("event", (event) => {
			this.syncMetadataFromEvent(threadId, event);
			queue.push(...mapRuntimeSessionEvent(event));
			wake?.();
		});

		try {
			const turn = this.runPrompt(session, blocks, cwd);

			while (true) {
				while (queue.length > 0) yield queue.shift() as AgentEvent;

				const raced = await Promise.race([
					turn.then((response) => ({ kind: "done" as const, response })),
					new Promise<{ kind: "update" }>((resolve) => {
						wake = () => resolve({ kind: "update" });
					}),
				]);

				if (raced.kind === "done") {
					while (queue.length > 0) yield queue.shift() as AgentEvent;
					return;
				}
			}
		} finally {
			unsub();
		}
	}

	private runPrompt(session: RuntimeSession, blocks: ChatMessage, cwd: string) {
		if (blocks.length === 1 && blocks[0]?.type === "text") {
			return session.prompt(blocks[0].text);
		}

		const connection = this.pool.getSdkConnection(this.agentName) as
			| {
					prompt: (params: {
						sessionId: string;
						prompt: ReturnType<typeof mapPromptBlocksToAcp>;
					}) => Promise<unknown>;
			  }
			| undefined;
		if (!connection?.prompt)
			throw new Error(
				`agent ${this.agentName} does not support structured prompts`
			);

		return connection.prompt({
			sessionId: session.sessionId,
			prompt: mapPromptBlocksToAcp(blocks, cwd),
		});
	}

	async cancel(threadId: string): Promise<void> {
		const session = this.sessions.get(threadId)?.session;
		if (!session) return;
		await session.cancel();
	}

	async close(threadId: string): Promise<void> {
		const session = this.sessions.get(threadId)?.session;
		if (!session) return;
		this.detachSessionMetadata(threadId);
		await session.close();
		this.sessions.delete(threadId);
	}

	async closeSession(sessionId: string, threadId?: string): Promise<void> {
		if (threadId) {
			const entry = this.sessions.get(threadId);
			if (entry?.session.sessionId === sessionId) {
				this.detachSessionMetadata(threadId);
				await entry.session.close();
				this.sessions.delete(threadId);
				return;
			}
		}

		for (const [id, entry] of this.sessions) {
			if (entry.session.sessionId !== sessionId) continue;
			this.detachSessionMetadata(id);
			await entry.session.close();
			this.sessions.delete(id);
			return;
		}

		const connection = this.pool.getSdkConnection(this.agentName) as
			| { closeSession?: (params: { sessionId: string }) => Promise<unknown> }
			| undefined;
		const closeSession = connection?.closeSession;
		if (closeSession) {
			await Result.tryPromise(() => closeSession({ sessionId }));
		}
	}

	private async recoverSessions(): Promise<void> {
		if (this.sessions.size === 0) return;

		const runtime = await this.pool.getRuntime(this.agentName);
		if (!runtime.agentCapabilities?.loadSession) {
			this.sessions.clear();
			return;
		}

		for (const [threadId, thread] of this.sessions) {
			const recovered = await Result.tryPromise(() =>
				openOrCreateRuntimeSession({
					runtime,
					sessionId: thread.session.sessionId,
					cwd: thread.cwd,
				})
			);

			recovered.match({
				ok: (session) => {
					this.sessions.set(threadId, {
						session: session.session,
						projectId: thread.projectId,
						cwd: thread.cwd,
					});
				},
				err: () => {
					this.sessions.delete(threadId);
				},
			});
		}
	}

	private async ensureHealthyPool(): Promise<void> {
		if (this.pool.getState(this.agentName) !== "crashed") return;
		await this.recoverSessions();
	}

	private async requireSession(
		threadId: string,
		projectId: string,
		cwd: string,
		persistedSessionId: string
	): Promise<RuntimeSession> {
		await this.ensureHealthyPool();
		const existing = this.sessions.get(threadId);
		if (existing) return existing.session;

		let pending = this.pendingSessions.get(threadId);
		if (!pending) {
			pending = this.openSessionFromPersisted(
				threadId,
				projectId,
				cwd,
				persistedSessionId
			);
			this.pendingSessions.set(threadId, pending);
			pending.finally(() => {
				this.pendingSessions.delete(threadId);
			});
		}

		return await pending;
	}

	private async openSessionFromPersisted(
		threadId: string,
		projectId: string,
		cwd: string,
		persistedSessionId: string
	): Promise<RuntimeSession> {
		const runtime = await this.pool.getRuntime(this.agentName);
		const recovered = await Result.tryPromise(() =>
			openOrCreateRuntimeSession({
				runtime,
				sessionId: persistedSessionId,
				cwd,
			})
		);

		if (recovered.isErr())
			throw new Error(
				`failed to resume session ${persistedSessionId} for agent ${this.agentName}`
			);

		const session = recovered.value.session;
		this.sessions.set(threadId, { session, projectId, cwd });
		this.attachSessionMetadata(threadId, session);
		return session;
	}

	private attachSessionMetadata(
		threadId: string,
		session: RuntimeSession
	): void {
		this.detachSessionMetadata(threadId);
		this.metadataByThread.set(threadId, {
			commands: this.commandsFromSession(session),
			usage: this.usageFromSession(session),
		});

		const unsub = session.on({
			sessionCommandsUpdated: (event) => {
				const current = this.metadataByThread.get(threadId);
				this.metadataByThread.set(threadId, {
					commands: event.commands,
					usage: current?.usage ?? {},
				});
			},
			sessionUsageUpdated: (event) => {
				const current = this.metadataByThread.get(threadId);
				this.metadataByThread.set(threadId, {
					commands: current?.commands ?? [],
					usage: {
						used: event.used ?? event.totalTokens,
						limit: event.size,
					},
				});
			},
		});
		this.sessionUnsubs.set(threadId, unsub);
	}

	private detachSessionMetadata(threadId: string): void {
		this.sessionUnsubs.get(threadId)?.();
		this.sessionUnsubs.delete(threadId);
		this.metadataByThread.delete(threadId);
	}

	private syncMetadataFromEvent(
		threadId: string,
		event: {
			type: string;
			commands?: AvailableCommand[];
			used?: number;
			size?: number;
			totalTokens?: number;
		}
	): void {
		if (event.type === "session.commands.updated") {
			const current = this.metadataByThread.get(threadId);
			this.metadataByThread.set(threadId, {
				commands: event.commands ?? [],
				usage: current?.usage ?? {},
			});
			return;
		}

		if (event.type === "session.usage.updated") {
			const current = this.metadataByThread.get(threadId);
			this.metadataByThread.set(threadId, {
				commands: current?.commands ?? [],
				usage: {
					used: event.used ?? event.totalTokens,
					limit: event.size,
				},
			});
		}
	}

	private async setConfigOptionByCategory(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string,
		category: string,
		value: string
	): Promise<void> {
		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		const configId = findSelectConfigOptionId(
			session.transcript.session.configOptions,
			category
		);
		if (!configId) {
			throw new Error(
				`agent ${this.agentName} does not expose ${category} options`
			);
		}
		await this.setConfigOption(
			threadId,
			projectId,
			cwd,
			sessionId,
			configId,
			value
		);
	}

	private async setConfigOption(
		threadId: string,
		projectId: string,
		cwd: string,
		sessionId: string,
		configId: string,
		value: string
	): Promise<void> {
		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);

		const connection = this.pool.getSdkConnection(this.agentName);
		if (!connection)
			throw new Error(`agent ${this.agentName} is not connected`);

		await setSessionConfigOption(
			connection,
			session.sessionId,
			configId,
			value
		);
	}
}
