import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { CLI_WORKER_BINARY, CLI_WORKER_RUNTIME_DIRECTORY } from "./cli-worker";
import { waitForExit } from "./process";

async function workerStatusExitCode(home: string): Promise<number | null> {
	const bin = process.env.CYRUS_WORKER_BIN ?? CLI_WORKER_BINARY;
	const proc = spawn(bin, ["status"], {
		cwd: CLI_WORKER_RUNTIME_DIRECTORY,
		env: {
			...process.env,
			CYRUS_HOME: home,
			CLI_PUBLIC_SERVER_URL:
				process.env.CLI_PUBLIC_SERVER_URL ?? "http://localhost:8787",
		},
		stdio: ["ignore", "ignore", "ignore"],
	});
	return await waitForExit(proc);
}

export async function waitForHttpOk(
	url: string,
	{
		timeoutMs = 60_000,
		intervalMs = 500,
	}: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {
			// retry until timeout
		}
		await sleep(intervalMs);
	}

	throw new Error(`Timed out waiting for ${url}`);
}

/**
 * Polls `cyrusd status` until exit 0 (ready + fresh heartbeat + live pid).
 */
export async function waitForHealthy(
	home: string,
	{
		timeoutMs = 120_000,
		intervalMs = 500,
	}: {
		timeoutMs?: number;
		intervalMs?: number;
	} = {}
): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		if ((await workerStatusExitCode(home)) === 0) {
			return;
		}
		await sleep(intervalMs);
	}

	throw new Error(`Timed out waiting for healthy worker in ${home}.`);
}
