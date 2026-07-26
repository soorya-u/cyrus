import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Result } from "better-result";
import type { seedCliAccessToken } from "./auth";
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
	startProcessCompose,
	stopProcessCompose,
} from "./process-compose";

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));
const PROCESS_COMPOSE_CONFIG = join(
	REPO_ROOT,
	"tests/e2e/process-compose.yaml"
);
const E2E_AUTH_FILE = "e2e-auth.json";

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

type SeededAuth = Awaited<ReturnType<typeof seedCliAccessToken>>;

export type E2eStack = {
	cyrusHome: string;
	auth: SeededAuth;
	wranglerEnvFile?: string;
	compose: ProcessComposeHandle;
	restartWorker: () => Promise<void>;
};

export type StartE2eStackOptions = {
	withWeb?: boolean;
};

async function readSeededAuth(home: string): Promise<SeededAuth> {
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
	return parsed as SeededAuth;
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
		wranglerEnvFile = await writeWranglerEnvFile(serverEnv);

		const readyProcesses = withWeb
			? ["server", "web", "worker"]
			: ["server", "worker"];
		const processes = withWeb ? ["web", "worker"] : ["worker"];

		compose = await startProcessCompose({
			configPath: PROCESS_COMPOSE_CONFIG,
			cwd: REPO_ROOT,
			processes,
			readyProcesses,
			env: {
				...process.env,
				...serverEnv,
				CYRUS_HOME: cyrusHome,
				WRANGLER_ENV_FILE: wranglerEnvFile,
				CYRUS_WORKER_BIN: CLI_WORKER_BINARY,
				CYRUS_WORKER_CWD: CLI_WORKER_RUNTIME_DIRECTORY,
				NODE_ENV: "testing",
			},
		});

		const auth = await readSeededAuth(cyrusHome);

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
