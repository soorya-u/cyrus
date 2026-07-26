import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Result } from "better-result";
import type { E2eAuth } from "./auth";
import {
	buildCompiledCliBinaryOnce,
	CLI_WORKER_BINARY,
	CLI_WORKER_RUNTIME_DIRECTORY,
} from "./cli-worker";
import {
	buildServerEnv,
	createTempCyrusHome,
	E2E_AUTH_FILE,
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

async function withIgnoredRejections<T>(run: () => Promise<T>): Promise<T> {
	const onRejection = () => {
		// signaling probes can reject RPCs while sockets are still opening
	};
	process.on("unhandledRejection", onRejection);
	try {
		return await run();
	} finally {
		process.off("unhandledRejection", onRejection);
	}
}

export type E2eStack = {
	cyrusHome: string;
	auth: E2eAuth;
	wranglerEnvFile?: string;
	compose: ProcessComposeHandle;
	restartWorker: () => Promise<void>;
};

export type StartE2eStackOptions = {
	withWeb?: boolean;
};

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

async function readE2eAuth(home: string): Promise<E2eAuth> {
	const raw = await readFile(join(home, E2E_AUTH_FILE), "utf8");
	const parsed: unknown = JSON.parse(raw);
	if (
		!parsed ||
		typeof parsed !== "object" ||
		typeof (parsed as { token?: unknown }).token !== "string" ||
		typeof (parsed as { userId?: unknown }).userId !== "string" ||
		typeof (parsed as { sessionCookie?: unknown }).sessionCookie !== "string" ||
		typeof (parsed as { sessionToken?: unknown }).sessionToken !== "string"
	) {
		throw new Error(`Invalid ${E2E_AUTH_FILE} written by seed-worker.`);
	}
	return parsed as E2eAuth;
}

async function createE2eStack(
	options: StartE2eStackOptions = {}
): Promise<E2eStack> {
	const { withWeb = false } = options;
	const serverEnv = buildServerEnv();
	const cyrusHome = await createTempCyrusHome();
	let wranglerEnvFile: string | undefined;
	let compose: ProcessComposeHandle | undefined;

	const stackResult = await Result.tryPromise(async () => {
		await buildCompiledCliBinaryOnce();
		const envFile = await writeWranglerEnvFile(serverEnv);
		wranglerEnvFile = envFile;

		const readyProcesses = withWeb ? ["server", "web"] : ["server"];
		const processes = withWeb ? ["web"] : ["server"];

		compose = await startProcessCompose({
			configPath: PROCESS_COMPOSE_CONFIG,
			cwd: REPO_ROOT,
			processes,
			readyProcesses,
			env: composeEnv(cyrusHome, envFile, serverEnv),
		});

		await startManagedProcess(compose, "seed", { waitUntil: "completed" });
		await startManagedProcess(compose, "worker");

		const auth = await readE2eAuth(cyrusHome);

		const restartWorker = async (): Promise<void> => {
			if (!compose) {
				throw new Error("process-compose stack is not running.");
			}
			await restartManagedProcess(compose, "worker");
		};

		return {
			cyrusHome,
			auth,
			wranglerEnvFile,
			compose,
			restartWorker,
		};
	});

	if (stackResult.isErr()) {
		if (compose) {
			(await Result.tryPromise(() => stopProcessCompose(compose))).tapError(
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

export function startE2eStack(
	options: StartE2eStackOptions = {}
): Promise<E2eStack> {
	return createE2eStack(options);
}

export async function stopE2eStack(stack: E2eStack): Promise<void> {
	await stopProcessCompose(stack.compose);
	await removeWranglerEnvFile(stack.wranglerEnvFile);
	await rm(stack.cyrusHome, { recursive: true, force: true }).catch(
		() => undefined
	);
}

export async function runE2eScenario(
	run: (stack: E2eStack) => Promise<void>,
	options: StartE2eStackOptions = {}
): Promise<void> {
	await withIgnoredRejections(async () => {
		const stack = await createE2eStack(options);
		const result = await Result.tryPromise(() => run(stack));
		await stopE2eStack(stack);
		result.unwrap();
	});
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
		if (compose) {
			(await Result.tryPromise(() => stopProcessCompose(compose))).tapError(
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
