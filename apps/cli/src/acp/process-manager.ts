import { env } from "@/lib/env";
import type { AgentEntry } from "@/validators/agent";
import { AcpAgentConnection, type AcpClientHandlers } from "./client";

export type ProcessState = "stopped" | "starting" | "ready" | "crashed";

type AgentProcess = {
	state: ProcessState;
	connection?: AcpAgentConnection;
	idleTimer?: ReturnType<typeof setTimeout>;
	startPromise?: Promise<AcpAgentConnection>;
	exitWatcher?: Promise<void>;
};

export type AgentProcessManagerOptions = {
	getEntry: (name: string) => Promise<AgentEntry | null>;
	handlers?: AcpClientHandlers;
	idleMs?: number;
};

export class AgentProcessManager {
	private readonly processes = new Map<string, AgentProcess>();
	private readonly getEntry: AgentProcessManagerOptions["getEntry"];
	private readonly handlers?: AcpClientHandlers;
	private readonly idleMs: number;

	constructor(options: AgentProcessManagerOptions) {
		this.getEntry = options.getEntry;
		this.handlers = options.handlers;
		this.idleMs = options.idleMs ?? env.CYRUS_ACP_IDLE_SHUTDOWN_MS;
	}

	isAvailable(entry: AgentEntry): boolean {
		return Bun.which(entry.command) !== null;
	}

	getState(name: string): ProcessState {
		return this.processes.get(name)?.state ?? "stopped";
	}

	async getConnection(name: string): Promise<AcpAgentConnection> {
		const existing = this.processes.get(name);
		if (existing?.connection && existing.state === "ready") {
			this.resetIdleTimer(name);
			return existing.connection;
		}
		if (existing?.startPromise) {
			return existing.startPromise;
		}

		const entry = await this.getEntry(name);
		if (!entry) {
			throw new Error(`agent "${name}" is not registered`);
		}
		if (!this.isAvailable(entry)) {
			throw new Error(`command not found on PATH: ${entry.command}`);
		}

		const startPromise = this.spawn(entry);
		const record: AgentProcess = {
			state: "starting",
			startPromise,
		};
		this.processes.set(name, record);

		try {
			const connection = await startPromise;
			record.connection = connection;
			record.state = "ready";
			record.startPromise = undefined;
			this.watchExit(name, connection);
			this.resetIdleTimer(name);
			return connection;
		} catch (error) {
			this.processes.delete(name);
			throw error;
		}
	}

	shutdown(): void {
		for (const name of [...this.processes.keys()]) {
			this.stopProcess(name);
		}
	}

	private spawn(entry: AgentEntry): Promise<AcpAgentConnection> {
		return AcpAgentConnection.spawn(entry, this.handlers);
	}

	private watchExit(name: string, connection: AcpAgentConnection): void {
		const record = this.processes.get(name);
		if (!record) return;

		record.exitWatcher = connection.exited.then((code) => {
			const current = this.processes.get(name);
			if (!current?.connection) return;
			if (current.connection !== connection) return;

			current.state = code === 0 ? "stopped" : "crashed";
			current.connection = undefined;
			if (current.idleTimer) {
				clearTimeout(current.idleTimer);
				current.idleTimer = undefined;
			}
		});
	}

	private resetIdleTimer(name: string): void {
		const record = this.processes.get(name);
		if (!record) return;

		if (record.idleTimer) clearTimeout(record.idleTimer);

		record.idleTimer = setTimeout(() => {
			this.stopProcess(name);
		}, this.idleMs);
	}

	private stopProcess(name: string): void {
		const record = this.processes.get(name);
		if (!record) return;

		if (record.idleTimer) clearTimeout(record.idleTimer);

		record.connection?.kill();
		this.processes.set(name, { state: "stopped" });
	}
}
