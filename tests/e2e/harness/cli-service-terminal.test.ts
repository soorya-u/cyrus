import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";
import { seedCliAccessToken } from "./auth";
import {
	buildCompiledCliBinaryOnce,
	CLI_WORKER_BINARY,
	CLI_WORKER_RUNTIME_DIRECTORY,
	writeCliWorkerState,
} from "./cli-worker";
import {
	buildCliEnv,
	buildServerEnv,
	createTempCyrusHome,
	E2E_SERVER_URL,
	isE2eEnabled,
	removeWranglerEnvFile,
	requireE2e,
	writeWranglerEnvFile,
} from "./env";
import { waitForExit } from "./process";
import {
	type ProcessComposeHandle,
	startProcessCompose,
	stopProcessCompose,
} from "./process-compose";
import {
	buildTerminalCliEnv,
	TERMINAL_COLS,
	TERMINAL_ROWS,
	withTerminalSession,
} from "./shell-use";
import { waitForHealthy } from "./wait";

/** Bun.color("green", "ansi-256") index used by print.success. */
const GREEN_FG = 28;

const NOT_RUNNING_PATTERN = /Not running/;
const E2E_WORKER_PATTERN = /E2E Worker/;

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));
const PROCESS_COMPOSE_CONFIG = join(
	REPO_ROOT,
	"tests/e2e/process-compose.yaml"
);

const e2eDescribe = isE2eEnabled() ? describe : describe.skip;

/** Parent `start --bg` must not inherit `CYRUS_DAEMON=1` (that skips the fork path). */
function buildServiceCliEnv(home: string): Record<string, string> {
	const { CYRUS_DAEMON: _, ...env } = buildTerminalCliEnv(buildCliEnv(home));
	return env;
}

async function stopWorkerBestEffort(home: string): Promise<void> {
	const proc = spawn(CLI_WORKER_BINARY, ["stop"], {
		cwd: CLI_WORKER_RUNTIME_DIRECTORY,
		env: {
			...process.env,
			CYRUS_HOME: home,
			CLI_PUBLIC_SERVER_URL: E2E_SERVER_URL,
		},
		stdio: "ignore",
	});
	await waitForExit(proc);
}

e2eDescribe("cyrusd service terminal tier", () => {
	let compose: ProcessComposeHandle | undefined;
	let wranglerEnvFile: string | undefined;
	let cyrusHome: string | undefined;

	afterEach(async () => {
		if (cyrusHome) {
			await stopWorkerBestEffort(cyrusHome);
		}
		if (compose) {
			await stopProcessCompose(compose);
			compose = undefined;
		}
		await removeWranglerEnvFile(wranglerEnvFile);
		wranglerEnvFile = undefined;
		if (cyrusHome) {
			await rm(cyrusHome, { recursive: true, force: true }).catch(
				() => undefined
			);
			cyrusHome = undefined;
		}
	});

	test("status reports Not running when no worker is present", async () => {
		requireE2e();
		await buildCompiledCliBinaryOnce();

		cyrusHome = await createTempCyrusHome();
		const cliEnv = buildServiceCliEnv(cyrusHome);

		await withTerminalSession(async (su) => {
			await su.run(CLI_WORKER_BINARY, ["status"], {
				cols: TERMINAL_COLS,
				rows: TERMINAL_ROWS,
				cwd: CLI_WORKER_RUNTIME_DIRECTORY,
				env: cliEnv,
			});

			const size = await su.getSize();
			expect(size).toEqual({ cols: TERMINAL_COLS, rows: TERMINAL_ROWS });

			await su.waitText("Not running", { timeout: 30_000 });
			await su.waitExit({ timeout: 15_000 });

			// shell-use does not reliably surface non-zero exit codes from the
			// compiled Bun binary; assert on the rendered failure line instead.
			expect((await su.state()).text).toMatch(NOT_RUNNING_PATTERN);
		});
	}, 120_000);

	test("start --bg, status, and stop render lifecycle output", async () => {
		requireE2e();
		await buildCompiledCliBinaryOnce();

		const serverEnv = buildServerEnv();
		cyrusHome = await createTempCyrusHome();
		wranglerEnvFile = await writeWranglerEnvFile(serverEnv);

		compose = await startProcessCompose({
			configPath: PROCESS_COMPOSE_CONFIG,
			cwd: REPO_ROOT,
			processes: ["server"],
			readyProcesses: ["server"],
			env: {
				...process.env,
				...serverEnv,
				WRANGLER_ENV_FILE: wranglerEnvFile,
				NODE_ENV: "testing",
			},
		});

		const auth = await seedCliAccessToken(E2E_SERVER_URL);
		await writeCliWorkerState(cyrusHome, auth.token);
		const cliEnv = buildServiceCliEnv(cyrusHome);

		await withTerminalSession(async (su) => {
			await su.run(CLI_WORKER_BINARY, ["start", "--bg"], {
				cols: TERMINAL_COLS,
				rows: TERMINAL_ROWS,
				cwd: CLI_WORKER_RUNTIME_DIRECTORY,
				env: cliEnv,
			});

			await su.waitText("started in background", { timeout: 60_000 });
			await su.expectText("started in background", {
				fg: String(GREEN_FG),
				strict: false,
			});
			await su.waitExit({ timeout: 30_000 });
			expect((await su.state()).exited).toBe(0);
		});

		await waitForHealthy(cyrusHome, { timeoutMs: 120_000 });

		await withTerminalSession(async (su) => {
			await su.run(CLI_WORKER_BINARY, ["status"], {
				cols: TERMINAL_COLS,
				rows: TERMINAL_ROWS,
				cwd: CLI_WORKER_RUNTIME_DIRECTORY,
				env: cliEnv,
			});

			await su.waitText("Running (pid", { timeout: 30_000 });
			await su.expectText("Running (pid", {
				fg: String(GREEN_FG),
				strict: false,
			});
			await su.waitExit({ timeout: 15_000 });
			expect((await su.state()).exited).toBe(0);
			expect((await su.state()).text).toMatch(E2E_WORKER_PATTERN);
		});

		await withTerminalSession(async (su) => {
			await su.run(CLI_WORKER_BINARY, ["stop"], {
				cols: TERMINAL_COLS,
				rows: TERMINAL_ROWS,
				cwd: CLI_WORKER_RUNTIME_DIRECTORY,
				env: cliEnv,
			});

			await su.waitText("stopped (pid", { timeout: 30_000 });
			await su.expectText("stopped (pid", {
				fg: String(GREEN_FG),
				strict: false,
			});
			await su.waitExit({ timeout: 15_000 });
			expect((await su.state()).exited).toBe(0);
		});

		await withTerminalSession(async (su) => {
			await su.run(CLI_WORKER_BINARY, ["status"], {
				cols: TERMINAL_COLS,
				rows: TERMINAL_ROWS,
				cwd: CLI_WORKER_RUNTIME_DIRECTORY,
				env: cliEnv,
			});

			await su.waitText("Not running", { timeout: 30_000 });
			await su.waitExit({ timeout: 15_000 });
			expect((await su.state()).text).toMatch(NOT_RUNNING_PATTERN);
		});
	}, 300_000);
});
