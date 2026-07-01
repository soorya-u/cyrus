import type { AgentEvent } from "./events";
import type { AgentProcessManager } from "./process-manager";

type ThreadSession = {
	sessionId: string;
	cwd: string;
};

export class SessionRouter {
	private readonly sessions = new Map<string, Map<string, ThreadSession>>();
	private readonly processManager: AgentProcessManager;

	constructor(processManager: AgentProcessManager) {
		this.processManager = processManager;
	}

	getSessionId(agentName: string, threadId: string): string | undefined {
		return this.sessions.get(agentName)?.get(threadId)?.sessionId;
	}

	async getOrCreateSession(
		agentName: string,
		threadId: string,
		cwd: string
	): Promise<string> {
		const agentSessions = this.sessions.get(agentName) ?? new Map();
		const existing = agentSessions.get(threadId);

		if (existing) return existing.sessionId;

		const connection = await this.processManager.getConnection(agentName);
		const created = await connection.newSession({ cwd, mcpServers: [] });
		agentSessions.set(threadId, { sessionId: created.sessionId, cwd });
		this.sessions.set(agentName, agentSessions);
		return created.sessionId;
	}

	async recoverSessions(agentName: string): Promise<void> {
		const agentSessions = this.sessions.get(agentName);
		if (!agentSessions || agentSessions.size === 0) return;

		const connection = await this.processManager.getConnection(agentName);
		const caps = connection.capabilities?.sessionCapabilities;

		for (const [threadId, session] of agentSessions) {
			if (caps?.resume) {
				await connection.resumeSession({
					sessionId: session.sessionId,
					cwd: session.cwd,
					mcpServers: [],
				});
				continue;
			}
			if (connection.capabilities?.loadSession) {
				await connection.loadSession({
					sessionId: session.sessionId,
					cwd: session.cwd,
					mcpServers: [],
				});
				continue;
			}
			agentSessions.delete(threadId);
		}
	}

	async *prompt(
		agentName: string,
		threadId: string,
		cwd: string,
		content: string
	): AsyncGenerator<AgentEvent> {
		if (this.processManager.getState(agentName) === "crashed")
			await this.recoverSessions(agentName);

		const sessionId = await this.getOrCreateSession(agentName, threadId, cwd);
		const connection = await this.processManager.getConnection(agentName);
		yield* connection.prompt(sessionId, content);
	}

	async cancel(agentName: string, threadId: string): Promise<void> {
		const sessionId = this.getSessionId(agentName, threadId);
		if (!sessionId) return;

		const connection = await this.processManager.getConnection(agentName);
		await connection.cancel(sessionId);
	}

	async close(agentName: string, threadId: string): Promise<void> {
		const agentSessions = this.sessions.get(agentName);
		const session = agentSessions?.get(threadId);
		if (!session) return;

		const connection = await this.processManager.getConnection(agentName);
		if (connection.capabilities?.sessionCapabilities?.close)
			await connection.closeSession(session.sessionId);

		agentSessions?.delete(threadId);
	}
}
