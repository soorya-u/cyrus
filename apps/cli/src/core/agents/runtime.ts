import { homedir } from "node:os";
import { openOrCreateRuntimeSession, type RuntimeSession } from "@acp-kit/core";
import type { ModelOption } from "@cyrus/connections/schemas/rtc/catalog";
import type { AgentEvent } from "@cyrus/connections/schemas/rtc/chat";
import type { SelectOption } from "@cyrus/connections/schemas/rtc/common";
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

export class AgentRuntime {
	private readonly agentName: string;
	private readonly pool: AgentPool;
	private readonly sessions = new Map<string, ThreadSession>();
	private probeSession: RuntimeSession | null = null;

	constructor(agentName: string, pool: AgentPool) {
		this.agentName = agentName;
		this.pool = pool;
	}

	async getModels(): Promise<ModelOption[]> {
		await this.ensureHealthyPool();
		const session = await this.getProbeSession();
		return modelsFromSession(session);
	}

	async getModes(): Promise<SelectOption[]> {
		await this.ensureHealthyPool();
		const session = await this.getProbeSession();
		return modesFromSession(session);
	}

	async getEfforts(): Promise<SelectOption[]> {
		await this.ensureHealthyPool();
		const session = await this.getProbeSession();
		return effortsFromSession(session);
	}

	async getPersonas(): Promise<SelectOption[]> {
		await this.ensureHealthyPool();
		const session = await this.getProbeSession();
		return personasFromSession(session);
	}

	async setModel(
		threadId: string,
		projectId: string,
		cwd: string,
		modelId: string
	): Promise<void> {
		await this.ensureHealthyPool();
		const session = await this.requireSession(threadId, projectId, cwd);
		await session.setModel(modelId);
	}

	async setMode(
		threadId: string,
		projectId: string,
		cwd: string,
		modeId: string
	): Promise<void> {
		await this.ensureHealthyPool();
		const session = await this.requireSession(threadId, projectId, cwd);
		await session.setMode(modeId);
	}

	async setEffort(
		threadId: string,
		projectId: string,
		cwd: string,
		effortId: string
	): Promise<void> {
		await this.setConfigOptionByCategory(
			threadId,
			projectId,
			cwd,
			"thought_level",
			effortId
		);
	}

	async setPersona(
		threadId: string,
		projectId: string,
		cwd: string,
		personaId: string
	): Promise<void> {
		const probe = await this.getProbeSession();
		const configId =
			findSelectConfigOptionId(
				probe.transcript.session.configOptions,
				"persona"
			) ??
			probe.transcript.session.configOptions.find(
				(option) =>
					option.type === "select" &&
					(option.category?.includes("persona") ||
						option.id.toLowerCase().includes("persona"))
			)?.id;

		if (!configId)
			throw new Error(
				`agent ${this.agentName} does not expose persona options`
			);

		await this.setConfigOption(threadId, projectId, cwd, configId, personaId);
	}

	async *prompt(
		threadId: string,
		projectId: string,
		cwd: string,
		content: string
	): AsyncGenerator<AgentEvent> {
		await this.ensureHealthyPool();

		const session = await this.requireSession(threadId, projectId, cwd);
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

	private async recoverSessions(): Promise<void> {
		if (this.sessions.size === 0) {
			this.probeSession = null;
			return;
		}

		const runtime = await this.pool.getRuntime(this.agentName);
		if (!runtime.agentCapabilities?.loadSession) {
			this.sessions.clear();
			this.probeSession = null;
			return;
		}

		this.probeSession = null;

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
		this.probeSession = null;
		await this.recoverSessions();
	}

	private async getProbeSession(): Promise<RuntimeSession> {
		await this.ensureHealthyPool();
		if (this.probeSession) return this.probeSession;

		const runtime = await this.pool.getRuntime(this.agentName);
		this.probeSession = await runtime.newSession({ cwd: homedir() });
		return this.probeSession;
	}

	private async requireSession(
		threadId: string,
		projectId: string,
		cwd: string
	): Promise<RuntimeSession> {
		await this.ensureHealthyPool();
		const existing = this.sessions.get(threadId);
		if (existing) return existing.session;

		const runtime = await this.pool.getRuntime(this.agentName);
		const session = await runtime.newSession({ cwd });
		this.sessions.set(threadId, { session, projectId, cwd });
		if (!this.probeSession) this.probeSession = session;
		return session;
	}

	private async setConfigOptionByCategory(
		threadId: string,
		projectId: string,
		cwd: string,
		category: string,
		value: string
	): Promise<void> {
		const probe = await this.getProbeSession();
		const configId = findSelectConfigOptionId(
			probe.transcript.session.configOptions,
			category
		);
		if (!configId) {
			throw new Error(
				`agent ${this.agentName} does not expose ${category} options`
			);
		}
		await this.setConfigOption(threadId, projectId, cwd, configId, value);
	}

	private async setConfigOption(
		threadId: string,
		projectId: string,
		cwd: string,
		configId: string,
		value: string
	): Promise<void> {
		const session = await this.requireSession(threadId, projectId, cwd);
		const connection = this.pool.getSdkConnection(this.agentName);
		if (!connection) {
			throw new Error(`agent ${this.agentName} is not connected`);
		}
		await setSessionConfigOption(
			connection,
			session.sessionId,
			configId,
			value
		);
	}
}
