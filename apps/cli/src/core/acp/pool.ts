import { type AcpRuntime, createAcpRuntime } from "@acp-kit/core";
import { Result } from "better-result";
import { agentEntryToProfile } from "@/core/agents/profile";
import { env } from "@/lib/env";
import type { AgentEntry } from "@/validators/agent";
import { createDefaultHost } from "./host";
import { createTrackedTransport } from "./transport";

export type ProcessState = "stopped" | "starting" | "ready" | "crashed";

type ManagedAgent = {
	runtime: AcpRuntime;
	getConnection: ReturnType<typeof createTrackedTransport>["getConnection"];
	state: ProcessState;
	idleTimer?: ReturnType<typeof setTimeout>;
	startPromise?: Promise<AcpRuntime>;
};

export type AgentPoolOptions = {
	getEntry: (name: string) => Promise<AgentEntry | null>;
	idleMs?: number;
};

export class AgentPool {
	private readonly agents = new Map<string, ManagedAgent>();
	private readonly getEntry: AgentPoolOptions["getEntry"];
	private readonly idleMs: number;

	constructor(options: AgentPoolOptions) {
		this.getEntry = options.getEntry;
		this.idleMs = options.idleMs ?? env.CYRUS_ACP_IDLE_SHUTDOWN_MS;
	}

	isAvailable(entry: AgentEntry): boolean {
		return Bun.which(entry.command) !== null;
	}

	getState(name: string): ProcessState {
		return this.agents.get(name)?.state ?? "stopped";
	}

	getSdkConnection(name: string) {
		return this.agents.get(name)?.getConnection?.();
	}

	async getRuntime(name: string): Promise<AcpRuntime> {
		const existing = this.agents.get(name);
		if (existing?.state === "ready" && existing.runtime.isReady) {
			this.resetIdleTimer(name);
			return existing.runtime;
		}
		if (existing?.startPromise) {
			return existing.startPromise;
		}
		if (existing?.state === "crashed") {
			await this.stopAgent(name);
		}

		const entry = await this.getEntry(name);
		if (!entry) throw new Error(`agent "${name}" is not registered`);

		if (!this.isAvailable(entry))
			throw new Error(`command not found on PATH: ${entry.command}`);

		const { transport, getConnection } = createTrackedTransport();
		this.agents.set(name, {
			runtime: undefined as unknown as AcpRuntime,
			getConnection,
			state: "starting",
		});

		const startPromise = this.bootRuntime(name, entry, transport);
		const starting = this.agents.get(name);
		if (starting) starting.startPromise = startPromise;

		const booted = await Result.tryPromise(() => startPromise);
		if (booted.isErr()) {
			this.agents.delete(name);
			throw booted.error;
		}

		const runtime = booted.value;
		const record = this.agents.get(name);
		if (record) {
			record.runtime = runtime;
			record.state = "ready";
			record.startPromise = undefined;
		}
		this.resetIdleTimer(name);
		return runtime;
	}

	shutdown(): void {
		for (const name of [...this.agents.keys()]) {
			Result.tryPromise(() => this.stopAgent(name)).catch(() => undefined);
		}
	}

	private bootRuntime(
		name: string,
		entry: AgentEntry,
		transport: ReturnType<typeof createTrackedTransport>["transport"]
	): Promise<AcpRuntime> {
		const runtime = createAcpRuntime({
			agent: {
				...agentEntryToProfile(name, entry),
				startupTimeoutMs: env.CYRUS_ACP_TIMEOUT_MS,
			},
			transport,
			host: createDefaultHost((info) => {
				const managed = this.agents.get(name);
				if (!managed) return;
				managed.state = info.code === 0 ? "stopped" : "crashed";
			}),
		});

		const managed = this.agents.get(name);
		if (managed) managed.runtime = runtime;

		return runtime.ready().then(() => runtime);
	}

	private resetIdleTimer(name: string): void {
		const record = this.agents.get(name);
		if (!record) return;

		if (record.idleTimer) clearTimeout(record.idleTimer);

		record.idleTimer = setTimeout(
			() =>
				Result.tryPromise(() => this.stopAgent(name)).catch(() => undefined),
			this.idleMs
		);
	}

	private async stopAgent(name: string): Promise<void> {
		const record = this.agents.get(name);
		if (!record) return;

		if (record.idleTimer) clearTimeout(record.idleTimer);

		await Result.tryPromise(record.runtime.shutdown);

		this.agents.set(name, {
			runtime: record.runtime,
			getConnection: record.getConnection,
			state: "stopped",
		});
	}
}
