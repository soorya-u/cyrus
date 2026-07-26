import { rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";
import { approveDeviceUserCode, createE2eAuthSession } from "./auth";
import { parseCliLoginPrompt } from "./cli-login";
import {
	buildCompiledCliBinaryOnce,
	CLI_WORKER_BINARY,
	CLI_WORKER_RUNTIME_DIRECTORY,
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

/** Bun.color("cyan"/"blue", "ansi-256") indexes used by the CLI style helpers. */
const CYAN_FG = 51;
const BLUE_FG = 21;
const LOGGED_IN_PATTERN = /Logged in/;

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));
const PROCESS_COMPOSE_CONFIG = join(
	REPO_ROOT,
	"tests/e2e/process-compose.yaml"
);

const e2eDescribe = isE2eEnabled() ? describe : describe.skip;

e2eDescribe("cyrusd login terminal tier", () => {
	let compose: ProcessComposeHandle | undefined;
	let wranglerEnvFile: string | undefined;
	let cyrusHome: string | undefined;

	afterEach(async () => {
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

	test("prints the device code and URL, then completes after approval", async () => {
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

		const email = `e2e-terminal-${crypto.randomUUID()}@cyrus.test`;
		const password = "e2e-test-password-32chars-min";
		const session = await createE2eAuthSession(E2E_SERVER_URL, email, password);

		const cliEnv = buildTerminalCliEnv(buildCliEnv(cyrusHome));

		await withTerminalSession(async (su) => {
			await su.run(CLI_WORKER_BINARY, ["login"], {
				cols: TERMINAL_COLS,
				rows: TERMINAL_ROWS,
				cwd: CLI_WORKER_RUNTIME_DIRECTORY,
				env: cliEnv,
			});

			const size = await su.getSize();
			expect(size).toEqual({ cols: TERMINAL_COLS, rows: TERMINAL_ROWS });

			await su.waitText("Waiting for approval", { timeout: 60_000 });
			const prompt = parseCliLoginPrompt(await su.text({ full: true }));

			// URL is blue; the code also appears in the query string, so match path only.
			await su.expectText("/auth/device", {
				fg: String(BLUE_FG),
				strict: false,
			});

			// User code on the "enter the code" line is cyan (ansi-256 51) + bold.
			const cells = await su.cells(0, 0, TERMINAL_COLS, TERMINAL_ROWS);
			const cyanRun = cells
				.filter((cell) => cell.fg === CYAN_FG)
				.map((cell) => cell.char)
				.join("");
			expect(cyanRun).toContain(prompt.userCode);
			expect(
				cells.some(
					(cell) =>
						cell.bold &&
						cell.fg === CYAN_FG &&
						prompt.userCode.includes(cell.char)
				)
			).toBe(true);

			await approveDeviceUserCode(
				E2E_SERVER_URL,
				session.sessionCookie,
				prompt.userCode
			);

			await su.waitText("Logged in", { timeout: 60_000 });
			await su.waitExit({ timeout: 30_000 });

			const state = await su.state();
			expect(state.exited).toBe(0);
			expect(state.text).toMatch(LOGGED_IN_PATTERN);
		});
	}, 180_000);
});
