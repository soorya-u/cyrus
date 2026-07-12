import { openOrCreateRuntimeSession, type RuntimeSession } from "@acp-kit/core";
import type { BindAgentOutput, ModelOption } from "@cyrus/schemas/rtc/catalog";
import type { AgentEvent } from "@cyrus/schemas/rtc/chat";
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

type ThreadSession = {
	session: RuntimeSession;
	projectId: string;
	cwd: string;
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
		content: string
	): AsyncGenerator<AgentEvent> {
		await this.ensureHealthyPool();

		const session = await this.requireSession(
			threadId,
			projectId,
			cwd,
			sessionId
		);
		const queue: AgentEvent[] = [];
		let wake: (() => void) | undefined;

		const unsub = session.on("event", (event) => {
			queue.push(...mapRuntimeSessionEvent(event));
			wake?.();
		});

		try {
			const turn = session.prompt(content);

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

	async cancel(threadId: string): Promise<void> {
		const session = this.sessions.get(threadId)?.session;
		if (!session) return;
		await session.cancel();
	}

	async close(threadId: string): Promise<void> {
		const session = this.sessions.get(threadId)?.session;
		if (!session) return;
		await session.close();
		this.sessions.delete(threadId);
	}

	async closeSession(sessionId: string, threadId?: string): Promise<void> {
		if (threadId) {
			const entry = this.sessions.get(threadId);
			if (entry?.session.sessionId === sessionId) {
				await entry.session.close();
				this.sessions.delete(threadId);
				return;
			}
		}

		for (const [id, entry] of this.sessions) {
			if (entry.session.sessionId !== sessionId) continue;
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
		return session;
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
