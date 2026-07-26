import { rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Result } from "better-result";
import {
	buildCompiledCliBinaryOnce,
	CLI_WORKER_BINARY,
	CLI_WORKER_RUNTIME_DIRECTORY,
} from "./cli-worker";
import {
	buildServerEnv,
	createTempCyrusHome,
	removeWranglerEnvFile,
	writeWranglerEnvFile,
} from "./env";
import {
	type ProcessComposeHandle,
	restartManagedProcess,
	startManagedProcess,
	startProcessCompose,
	stopProcessCompose,
} from "./process-compose";

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));
const PROCESS_COMPOSE_CONFIG = join(
	REPO_ROOT,
	"tests/e2e/process-compose.yaml"
);

/** process-compose stack for Playwright: server+web first, worker on demand. */
export type PlaywrightE2eStack = {
	cyrusHome: string;
	wranglerEnvFile?: string;
	compose: ProcessComposeHandle;
	startWorker: () => Promise<void>;
	restartWorker: () => Promise<void>;
};

function composeEnv(
	cyrusHome: string,
	wranglerEnvFile: string,
	serverEnv: Record<string, string>
): Record<string, string | undefined> {
	return {
		...process.env,
		...serverEnv,
		CYRUS_HOME: cyrusHome,
		WRANGLER_ENV_FILE: wranglerEnvFile,
		CYRUS_WORKER_BIN: CLI_WORKER_BINARY,
		CYRUS_WORKER_CWD: CLI_WORKER_RUNTIME_DIRECTORY,
		NODE_ENV: "testing",
	};
}

/**
 * Starts sync server + Controller web via process-compose. The Worker is
 * started later (after Playwright device-UI auth writes CYRUS_HOME state).
 */
export async function startPlaywrightE2eStack(): Promise<PlaywrightE2eStack> {
	const serverEnv = buildServerEnv();
	const cyrusHome = await createTempCyrusHome();
	let wranglerEnvFile: string | undefined;
	let compose: ProcessComposeHandle | undefined;

	const stackResult = await Result.tryPromise(async () => {
		await buildCompiledCliBinaryOnce();
		const envFile = await writeWranglerEnvFile(serverEnv);
		wranglerEnvFile = envFile;

		compose = await startProcessCompose({
			configPath: PROCESS_COMPOSE_CONFIG,
			cwd: REPO_ROOT,
			processes: ["web"],
			readyProcesses: ["server", "web"],
			env: composeEnv(cyrusHome, envFile, serverEnv),
		});

		let workerStarted = false;
		const startWorker = async (): Promise<void> => {
			if (!compose) {
				throw new Error("process-compose stack is not running.");
			}
			if (workerStarted) return;
			await startManagedProcess(compose, "worker");
			workerStarted = true;
		};

		const restartWorker = async (): Promise<void> => {
			if (!compose) {
				throw new Error("process-compose stack is not running.");
			}
			if (!workerStarted) {
				throw new Error("Worker has not been started yet.");
			}
			await restartManagedProcess(compose, "worker");
		};

		return {
			cyrusHome,
			wranglerEnvFile,
			compose,
			startWorker,
			restartWorker,
		};
	});

	if (stackResult.isErr()) {
		const started = compose;
		if (started) {
			(await Result.tryPromise(() => stopProcessCompose(started))).tapError(
				() => {
					// best-effort cleanup after partial stack startup
				}
			);
		}
		await removeWranglerEnvFile(wranglerEnvFile);
		await rm(cyrusHome, { recursive: true, force: true }).catch(
			() => undefined
		);
	}

	return stackResult.unwrap();
}

export async function stopPlaywrightE2eStack(
	stack: PlaywrightE2eStack
): Promise<void> {
	await stopProcessCompose(stack.compose);
	await removeWranglerEnvFile(stack.wranglerEnvFile);
	await rm(stack.cyrusHome, { recursive: true, force: true }).catch(
		() => undefined
	);
}
