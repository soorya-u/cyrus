import { readFileSync, unlinkSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { Result } from "better-result";
import writeFileAtomic from "write-file-atomic";
import { HEALTH_PATH, WORKER_HEALTH } from "@/constants/paths";
import { env } from "@/lib/env";
import { ensureDir } from "@/utils/fs";
import { isAlive } from "@/utils/process";

/** Heartbeat older than this is treated as unhealthy. */
export const DEFAULT_HEALTH_STALE_MS = 15_000;

/** How often the worker refreshes its heartbeat while ready. */
export const HEALTH_HEARTBEAT_INTERVAL_MS = 5000;

export type WorkerHealthStatus = "starting" | "ready";

export type WorkerHealth = {
	status: WorkerHealthStatus;
	pid: number;
	connectedAt: string | null;
	heartbeat: string;
};

type HealthLocation = {
	home?: string;
};

type HealthTimeOptions = HealthLocation & {
	nowMs?: number;
	staleThresholdMs?: number;
};

function resolveHealthPath(home?: string): string {
	return home === undefined ? HEALTH_PATH : join(home, WORKER_HEALTH);
}

function isWorkerHealth(value: unknown): value is WorkerHealth {
	if (!value || typeof value !== "object") {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		(record.status === "starting" || record.status === "ready") &&
		typeof record.pid === "number" &&
		Number.isInteger(record.pid) &&
		record.pid > 0 &&
		(record.connectedAt === null || typeof record.connectedAt === "string") &&
		typeof record.heartbeat === "string"
	);
}

export async function readHealth(
	options: HealthLocation = {}
): Promise<WorkerHealth | null> {
	const path = resolveHealthPath(options.home);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		return null;
	}

	const parsed = await Result.tryPromise(() => file.json());
	if (parsed.isErr() || !isWorkerHealth(parsed.value)) {
		return null;
	}
	return parsed.value;
}

async function writeHealth(
	health: WorkerHealth,
	options: HealthLocation = {}
): Promise<void> {
	const home = options.home ?? env.CYRUS_HOME;
	const path = resolveHealthPath(options.home);
	await ensureDir(home);
	await writeFileAtomic(path, `${JSON.stringify(health)}\n`, { mode: 0o600 });
}

export async function clearHealth(options: HealthLocation = {}): Promise<void> {
	await unlink(resolveHealthPath(options.home)).catch(() => {
		// already gone
	});
}

/** Sync cleanup for `process.on('exit')` — only removes health owned by `pid`. */
export function clearOwnHealthSync(pid: number): void {
	Result.try(() => {
		const raw = readFileSync(HEALTH_PATH, "utf8");
		const parsed: unknown = JSON.parse(raw);
		if (isWorkerHealth(parsed) && parsed.pid === pid) {
			unlinkSync(HEALTH_PATH);
		}
	});
}

export async function markHealthStarting(
	options: HealthLocation & { pid: number }
): Promise<void> {
	const now = new Date().toISOString();
	await writeHealth(
		{
			status: "starting",
			pid: options.pid,
			connectedAt: null,
			heartbeat: now,
		},
		options
	);
}

export async function markHealthReady(
	options: HealthLocation & { pid: number }
): Promise<void> {
	const now = new Date().toISOString();
	await writeHealth(
		{
			status: "ready",
			pid: options.pid,
			connectedAt: now,
			heartbeat: now,
		},
		options
	);
}

export async function touchHeartbeat(
	options: HealthLocation = {}
): Promise<void> {
	const current = await readHealth(options);
	if (!current || current.status !== "ready") {
		return;
	}
	await writeHealth(
		{
			...current,
			heartbeat: new Date().toISOString(),
		},
		options
	);
}

/** True when health.json says ready, the heartbeat is fresh, and the pid is alive. */
export async function isHealthy(
	options: HealthTimeOptions = {}
): Promise<boolean> {
	const health = await readHealth(options);
	if (!health || health.status !== "ready") {
		return false;
	}
	if (!isAlive(health.pid)) {
		return false;
	}

	const heartbeatMs = Date.parse(health.heartbeat);
	if (Number.isNaN(heartbeatMs)) {
		return false;
	}

	const nowMs = options.nowMs ?? Date.now();
	const staleThresholdMs = options.staleThresholdMs ?? DEFAULT_HEALTH_STALE_MS;
	return nowMs - heartbeatMs < staleThresholdMs;
}
