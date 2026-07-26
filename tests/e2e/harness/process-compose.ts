import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { delimiter, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { waitForExit } from "./process";

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));
const PROCESS_COMPOSE_NAME = "process-compose";

export type ProcessComposeState = {
	name: string;
	status: string;
	is_ready: string;
	has_ready_probe: boolean;
	pid: number;
	is_running: boolean;
	restarts: number;
};

export type ProcessComposeHandle = {
	apiPort: number;
	configPath: string;
	proc: ChildProcess;
	cwd: string;
};

export type StartProcessComposeOptions = {
	configPath: string;
	apiPort?: number;
	cwd?: string;
	env?: Record<string, string | undefined>;
	/** Process names passed to `process-compose up` (deps are pulled in). */
	processes?: string[];
	readyProcesses?: string[];
	readyTimeoutMs?: number;
};

function findOnPath(binary: string): string | undefined {
	const pathEnv = process.env.PATH ?? "";
	for (const dir of pathEnv.split(delimiter)) {
		if (!dir) continue;
		const candidate = join(dir, binary);
		if (existsSync(candidate)) {
			return candidate;
		}
	}
}

function processComposeBin(): string {
	if (process.env.PROCESS_COMPOSE_BIN) {
		return process.env.PROCESS_COMPOSE_BIN;
	}

	const onPath = findOnPath(PROCESS_COMPOSE_NAME);
	if (onPath) {
		return onPath;
	}

	const home = process.env.HOME;
	if (home) {
		const miseCandidate = join(
			home,
			".local/share/mise/installs/process-compose/1/process-compose"
		);
		if (existsSync(miseCandidate)) {
			return miseCandidate;
		}
	}

	throw new Error(
		"process-compose not found. Install via `mise install` (see mise.toml) or set PROCESS_COMPOSE_BIN."
	);
}

async function reserveApiPort(): Promise<number> {
	return await new Promise((resolve, reject) => {
		const server = createServer();
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (!address || typeof address === "string") {
				server.close();
				reject(new Error("Failed to reserve a process-compose API port."));
				return;
			}
			const { port } = address;
			server.close((error) => {
				if (error) reject(error);
				else resolve(port);
			});
		});
		server.on("error", reject);
	});
}

async function runProcessCompose(
	args: string[],
	options: {
		apiPort: number;
		cwd?: string;
		env?: Record<string, string | undefined>;
		stdio?: "pipe" | "inherit" | "ignore";
	}
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
	const proc = spawn(processComposeBin(), args, {
		cwd: options.cwd ?? REPO_ROOT,
		env: {
			...process.env,
			...options.env,
			PC_PORT_NUM: String(options.apiPort),
			// Quiet the client looking for a missing XDG config home.
			PC_DISABLE_TUI: "1",
		},
		stdio:
			options.stdio === "inherit"
				? "inherit"
				: ["ignore", options.stdio ?? "pipe", options.stdio ?? "pipe"],
	});

	let stdout = "";
	let stderr = "";
	if (proc.stdout) {
		proc.stdout.setEncoding("utf8");
		proc.stdout.on("data", (chunk: string) => {
			stdout += chunk;
		});
	}
	if (proc.stderr) {
		proc.stderr.setEncoding("utf8");
		proc.stderr.on("data", (chunk: string) => {
			stderr += chunk;
		});
	}

	const exitCode = await waitForExit(proc);
	return { stdout, stderr, exitCode };
}

export async function getProcessState(
	handle: ProcessComposeHandle,
	name: string
): Promise<ProcessComposeState> {
	const { stdout, stderr, exitCode } = await runProcessCompose(
		["process", "get", name, "-o", "json", "-p", String(handle.apiPort)],
		{ apiPort: handle.apiPort, cwd: handle.cwd }
	);
	if (exitCode !== 0) {
		throw new Error(
			`process-compose get ${name} failed (${exitCode}): ${stderr || stdout}`
		);
	}

	const parsed = JSON.parse(stdout) as
		| ProcessComposeState
		| ProcessComposeState[];
	const state = Array.isArray(parsed) ? parsed[0] : parsed;
	if (!state) {
		throw new Error(`process-compose get ${name} returned no state.`);
	}
	return state;
}

export async function waitForProcessReady(
	handle: ProcessComposeHandle,
	name: string,
	{
		timeoutMs = 120_000,
		previousPid,
	}: { timeoutMs?: number; previousPid?: number } = {}
): Promise<ProcessComposeState> {
	const deadline = Date.now() + timeoutMs;
	let lastError: unknown;

	while (Date.now() < deadline) {
		try {
			const state = await getProcessState(handle, name);
			const ready = state.is_ready === "Ready" && state.is_running;
			const pidChanged = previousPid === undefined || state.pid !== previousPid;
			if (ready && pidChanged) {
				return state;
			}
		} catch (error) {
			lastError = error;
		}
		await sleep(250);
	}

	throw new Error(
		`Timed out waiting for process-compose process "${name}" to become ready.${
			lastError ? ` Last error: ${String(lastError)}` : ""
		}`
	);
}

export async function startProcessCompose(
	options: StartProcessComposeOptions
): Promise<ProcessComposeHandle> {
	const apiPort = options.apiPort ?? (await reserveApiPort());
	const cwd = options.cwd ?? REPO_ROOT;
	const readyProcesses = options.readyProcesses ?? [];

	const proc = spawn(
		processComposeBin(),
		[
			"up",
			"-f",
			options.configPath,
			"-t=false",
			"--ordered-shutdown",
			"-p",
			String(apiPort),
			...(options.processes ?? []),
		],
		{
			cwd,
			env: {
				...process.env,
				...options.env,
				PC_PORT_NUM: String(apiPort),
			},
			stdio: ["ignore", "pipe", "pipe"],
			detached: true,
		}
	);
	proc.unref();

	const handle: ProcessComposeHandle = {
		apiPort,
		configPath: options.configPath,
		proc,
		cwd,
	};

	try {
		for (const name of readyProcesses) {
			await waitForProcessReady(handle, name, {
				timeoutMs: options.readyTimeoutMs,
			});
		}
		return handle;
	} catch (error) {
		await stopProcessCompose(handle);
		throw error;
	}
}

export async function restartManagedProcess(
	handle: ProcessComposeHandle,
	name: string
): Promise<ProcessComposeState> {
	const before = await getProcessState(handle, name);
	const { stderr, exitCode } = await runProcessCompose(
		["process", "restart", name, "-p", String(handle.apiPort)],
		{ apiPort: handle.apiPort, cwd: handle.cwd }
	);
	if (exitCode !== 0) {
		throw new Error(
			`process-compose restart ${name} failed (${exitCode}): ${stderr}`
		);
	}
	return await waitForProcessReady(handle, name, {
		previousPid: before.pid,
	});
}

export async function stopProcessCompose(
	handle: ProcessComposeHandle
): Promise<void> {
	const down = await runProcessCompose(["down", "-p", String(handle.apiPort)], {
		apiPort: handle.apiPort,
		cwd: handle.cwd,
	});

	if (handle.proc.exitCode === null && handle.proc.pid) {
		try {
			process.kill(-handle.proc.pid, "SIGTERM");
		} catch {
			handle.proc.kill("SIGTERM");
		}
		await waitForExit(handle.proc).catch(() => undefined);
	}

	if (down.exitCode !== 0 && down.exitCode !== null) {
		// Best-effort: the project may already be down.
	}
}
