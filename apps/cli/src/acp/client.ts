import {
	type ClientConnection,
	type ContentBlock,
	client as createAcpClient,
	type InitializeResponse,
	type LoadSessionRequest,
	type LoadSessionResponse,
	methods,
	type NewSessionRequest,
	type NewSessionResponse,
	ndJsonStream,
	PROTOCOL_VERSION,
	type ResumeSessionRequest,
	type ResumeSessionResponse,
	type SessionId,
	type SessionNotification,
} from "@agentclientprotocol/sdk";
import { env } from "@/lib/env";
import { stdinWritable } from "@/utils/io";
import type { AgentEntry } from "@/validators/agent";
import {
	type AgentEvent,
	mapSessionNotification,
	type PermissionHandler,
} from "./events";

export type AcpClientHandlers = {
	onPermissionRequest?: PermissionHandler;
	onSessionUpdate?: (notification: SessionNotification) => void;
};

export type AcpInitializeResult = {
	agentInfo?: InitializeResponse["agentInfo"];
	agentCapabilities?: InitializeResponse["agentCapabilities"];
	authMethods?: InitializeResponse["authMethods"];
};

type UpdateListener = (notification: SessionNotification) => void;

export class AcpAgentConnection {
	readonly init: AcpInitializeResult;

	private readonly proc: Bun.Subprocess;
	private readonly connection: ClientConnection;
	private readonly updateListeners: Map<string, Set<UpdateListener>>;

	private constructor(
		proc: Bun.Subprocess,
		connection: ClientConnection,
		init: AcpInitializeResult,
		updateListeners: Map<string, Set<UpdateListener>>
	) {
		this.proc = proc;
		this.connection = connection;
		this.init = init;
		this.updateListeners = updateListeners;
	}

	static async spawn(
		entry: AgentEntry,
		handlers: AcpClientHandlers = {}
	): Promise<AcpAgentConnection> {
		const executable = Bun.which(entry.command);
		if (!executable) {
			throw new Error(`command not found on PATH: ${entry.command}`);
		}

		const proc = Bun.spawn([executable, ...entry.args], {
			stdin: "pipe",
			stdout: "pipe",
			stderr: "pipe",
			env: process.env,
		});

		if (!(proc.stdin && proc.stdout)) {
			proc.kill();
			throw new Error("failed to open subprocess stdio pipes");
		}

		const stream = ndJsonStream(stdinWritable(proc.stdin), proc.stdout);
		const updateListeners = new Map<string, Set<UpdateListener>>();

		const app = createAcpClient({ name: "cyrus" })
			.onRequest(methods.client.session.requestPermission, (ctx) => {
				if (handlers.onPermissionRequest)
					return handlers.onPermissionRequest(ctx.params);

				const allow =
					ctx.params.options.find((o) => o.kind === "allow_once") ??
					ctx.params.options.find((o) => o.kind === "allow_always") ??
					ctx.params.options[0];

				if (!allow) return { outcome: { outcome: "cancelled" } };

				return {
					outcome: { outcome: "selected", optionId: allow.optionId },
				};
			})
			.onNotification(methods.client.session.update, (ctx) => {
				handlers.onSessionUpdate?.(ctx.params);
				const listeners = updateListeners.get(ctx.params.sessionId);
				if (listeners) {
					for (const listener of listeners) listener(ctx.params);
				}
			});

		const connection = app.connect(stream);

		const initResponse = await connection.agent.request(
			methods.agent.initialize,
			{
				protocolVersion: PROTOCOL_VERSION,
				clientCapabilities: {},
			},
			{
				cancellationSignal: AbortSignal.timeout(env.CYRUS_ACP_TIMEOUT_MS),
			}
		);

		return new AcpAgentConnection(
			proc,
			connection,
			{
				agentInfo: initResponse.agentInfo,
				agentCapabilities: initResponse.agentCapabilities,
				authMethods: initResponse.authMethods,
			},
			updateListeners
		);
	}

	get capabilities(): InitializeResponse["agentCapabilities"] {
		return this.init.agentCapabilities;
	}

	get exited(): Promise<number> {
		return this.proc.exited;
	}

	async newSession(
		request: NewSessionRequest | string
	): Promise<NewSessionResponse> {
		const params =
			typeof request === "string" ? { cwd: request, mcpServers: [] } : request;
		return await this.connection.agent.request(
			methods.agent.session.new,
			params
		);
	}

	async resumeSession(
		params: ResumeSessionRequest
	): Promise<ResumeSessionResponse> {
		return await this.connection.agent.request(
			methods.agent.session.resume,
			params
		);
	}

	async loadSession(params: LoadSessionRequest): Promise<LoadSessionResponse> {
		return await this.connection.agent.request(
			methods.agent.session.load,
			params
		);
	}

	async cancel(sessionId: SessionId): Promise<void> {
		await this.connection.agent.request(methods.agent.session.cancel, {
			sessionId,
		});
	}

	async closeSession(sessionId: SessionId): Promise<void> {
		await this.connection.agent.request(methods.agent.session.close, {
			sessionId,
		});
	}

	async *prompt(
		sessionId: SessionId,
		content: string | ContentBlock | ContentBlock[]
	): AsyncGenerator<AgentEvent> {
		const blocks = normalizePrompt(content);
		const queue: AgentEvent[] = [];
		let wake: (() => void) | undefined;

		const listener: UpdateListener = (notification) => {
			queue.push(...mapSessionNotification(notification));
			wake?.();
		};

		this.addUpdateListener(sessionId, listener);

		try {
			const turn = this.connection.agent.request(methods.agent.session.prompt, {
				sessionId,
				prompt: blocks,
			});

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
			this.removeUpdateListener(sessionId, listener);
		}
	}

	kill(): void {
		this.connection.close();
		this.proc.kill();
	}

	private addUpdateListener(sessionId: string, listener: UpdateListener): void {
		const listeners = this.updateListeners.get(sessionId) ?? new Set();
		listeners.add(listener);
		this.updateListeners.set(sessionId, listeners);
	}

	private removeUpdateListener(
		sessionId: string,
		listener: UpdateListener
	): void {
		const listeners = this.updateListeners.get(sessionId);
		listeners?.delete(listener);
		if (listeners?.size === 0) {
			this.updateListeners.delete(sessionId);
		}
	}
}

function normalizePrompt(
	content: string | ContentBlock | ContentBlock[]
): ContentBlock[] {
	if (typeof content === "string") {
		return [{ type: "text", text: content }];
	}
	return Array.isArray(content) ? content : [content];
}
