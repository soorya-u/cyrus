import { type AcpRuntime, createAcpRuntime } from "@acp-kit/core";
import { Result } from "better-result";
import { agentEntryToProfile } from "@/core/agents/profile";
import { env } from "@/lib/env";
import type { AgentEntry } from "@/validators/agent";
import { createInteractiveHost } from "./interactive";
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
		if (existing?.startPromise) return existing.startPromise;
		if (existing?.state === "crashed") await this.stopAgent(name);

		const { transport, getConnection } = createTrackedTransport();
		const startPromise = this.startRuntime(name, transport);
		this.agents.set(name, {
			runtime: undefined as unknown as AcpRuntime,
			getConnection,
			state: "starting",
			startPromise,
		});

		const booted = await Result.tryPromise(() => startPromise);
		if (booted.isErr()) {
			await this.stopAgent(name);
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

	async shutdown(): Promise<void> {
		await Promise.allSettled(
			[...this.agents.keys()].map((name) => this.stopAgent(name))
		);
	}

	private async startRuntime(
		name: string,
		transport: ReturnType<typeof createTrackedTransport>["transport"]
	): Promise<AcpRuntime> {
		const entry = await this.getEntry(name);
		if (!entry) throw new Error(`agent "${name}" is not enabled`);

		return this.bootRuntime(name, entry, transport);
	}

	private async bootRuntime(
		name: string,
		entry: AgentEntry,
		transport: ReturnType<typeof createTrackedTransport>["transport"]
	): Promise<AcpRuntime> {
		const profile = await agentEntryToProfile(name, entry);
		if (profile.isErr()) throw new Error(profile.error);
		const runtime = createAcpRuntime({
			agent: {
				...profile.value,
				startupTimeoutMs: env.CYRUS_ACP_TIMEOUT_MS,
			},
			transport,
			host: createInteractiveHost((info) => {
				const managed = this.agents.get(name);
				if (!managed) return;
				managed.state = info.code === 0 ? "stopped" : "crashed";
			}),
		});

		const managed = this.agents.get(name);
		if (managed) managed.runtime = runtime;

		const ready = await Result.tryPromise(() => runtime.ready());
		if (ready.isErr()) {
			await Result.tryPromise(() => runtime.shutdown());
			throw ready.error;
		}

		return runtime;
	}

	private resetIdleTimer(name: string): void {
		const record = this.agents.get(name);
		if (!record) return;

		if (record.idleTimer) clearTimeout(record.idleTimer);

		record.idleTimer = setTimeout(() => {
			Result.tryPromise(() => this.stopAgent(name)).catch(() => undefined);
		}, this.idleMs);
	}

	private async stopAgent(name: string): Promise<void> {
		const record = this.agents.get(name);
		if (!record) return;

		if (record.idleTimer) clearTimeout(record.idleTimer);

		await Result.tryPromise(() => record.runtime.shutdown());

		this.agents.set(name, {
			runtime: record.runtime,
			getConnection: record.getConnection,
			state: "stopped",
		});
	}
}
