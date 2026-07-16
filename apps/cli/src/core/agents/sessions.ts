import { openOrCreateRuntimeSession, type RuntimeSession } from "@acp-kit/core";
import { Result } from "better-result";
import type { AgentPool } from "@/core/acp/pool";
import type { SessionMetadataStore } from "./metadata";

export type ThreadSession = {
	session: RuntimeSession;
	projectId: string;
	cwd: string;
};

export class ThreadSessionStore {
	private readonly sessions = new Map<string, ThreadSession>();
	private readonly pendingSessions = new Map<string, Promise<RuntimeSession>>();

	constructor(
		// biome-ignore lint/style/noParameterProperties: intentional concise DI wiring
		private readonly agentName: string,
		// biome-ignore lint/style/noParameterProperties: intentional concise DI wiring
		private readonly pool: AgentPool,
		// biome-ignore lint/style/noParameterProperties: intentional concise DI wiring
		private readonly metadata: SessionMetadataStore
	) {}

	getLiveSession(threadId: string): {
		sessionId: string;
		projectId: string;
		cwd: string;
	} | null {
		const entry = this.sessions.get(threadId);
		if (!entry) return null;
		return {
			sessionId: entry.session.sessionId,
			projectId: entry.projectId,
			cwd: entry.cwd,
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
		this.metadata.attach(threadId, session);
		return session;
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
		this.metadata.detach(threadId);
		this.sessions.delete(threadId);
	}

	async closeSession(sessionId: string, threadId?: string): Promise<void> {
		if (threadId) {
			const entry = this.sessions.get(threadId);
			if (entry?.session.sessionId === sessionId) {
				await entry.session.close();
				this.metadata.detach(threadId);
				this.sessions.delete(threadId);
				return;
			}
		}

		for (const [id, entry] of this.sessions) {
			if (entry.session.sessionId !== sessionId) continue;
			await entry.session.close();
			this.metadata.detach(id);
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

	async requireSession(
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

	async ensureHealthyPool(): Promise<void> {
		if (this.pool.getState(this.agentName) !== "crashed") return;
		await this.recoverSessions();
	}

	private async recoverSessions(): Promise<void> {
		if (this.sessions.size === 0) return;

		const runtime = await this.pool.getRuntime(this.agentName);
		if (!runtime.agentCapabilities?.loadSession) {
			this.metadata.clearAll();
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
					this.metadata.attach(threadId, session.session);
				},
				err: () => {
					this.metadata.detach(threadId);
					this.sessions.delete(threadId);
				},
			});
		}
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

		if (recovered.isErr()) {
			throw new Error(
				`failed to resume session ${persistedSessionId} for agent ${this.agentName}`
			);
		}

		const session = recovered.value.session;
		this.sessions.set(threadId, { session, projectId, cwd });
		this.metadata.attach(threadId, session);
		return session;
	}
}
