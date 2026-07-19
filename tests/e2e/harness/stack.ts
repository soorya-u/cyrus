import { Result } from "better-result";
import { seedCliAccessToken } from "./auth";
import { CLI_CONNECTED_PATTERN, writeCliWorkerState } from "./cli-worker";
import { ensureDatabaseSchema } from "./database";
import {
	buildCliEnv,
	buildServerEnv,
	buildWebEnv,
	createTempCyrusHome,
	E2E_SERVER_URL,
	E2E_WEB_URL,
	removeWranglerEnvFile,
	writeWranglerEnvFile,
} from "./env";
import {
	cleanupDevServerProcesses,
	type ManagedProcess,
	spawnCliWorker,
	spawnServer,
	spawnWeb,
	stopAll,
} from "./spawn";
import { waitForHttpOk, waitForLogLine } from "./wait";

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
	processes: ManagedProcess[];
	cyrusHome: string;
	auth: Awaited<ReturnType<typeof seedCliAccessToken>>;
	wranglerEnvFile?: string;
};

async function waitForWorkerConnected(
	cli: ManagedProcess,
	timeoutMs = 120_000
): Promise<void> {
	const { stderr, stdout } = cli.proc;
	if (!(stdout instanceof ReadableStream && stderr instanceof ReadableStream)) {
		throw new Error(
			"CLI worker stdout/stderr must be piped for E2E readiness."
		);
	}

	await waitForLogLine(stdout, stderr, CLI_CONNECTED_PATTERN, timeoutMs);
}

export type StartE2eStackOptions = {
	withWeb?: boolean;
};

async function createE2eStack(
	options: StartE2eStackOptions = {}
): Promise<E2eStack> {
	const { withWeb = false } = options;
	const serverEnv = buildServerEnv();
	const webEnv = buildWebEnv();
	const cyrusHome = await createTempCyrusHome();
	const processes: ManagedProcess[] = [];
	let wranglerEnvFile: string | undefined;

	const stackResult = await Result.tryPromise(async () => {
		await cleanupDevServerProcesses();
		await ensureDatabaseSchema(serverEnv);

		wranglerEnvFile = await writeWranglerEnvFile(serverEnv);
		const server = spawnServer(serverEnv, wranglerEnvFile);
		processes.push(server);
		await waitForHttpOk(`${E2E_SERVER_URL}/health`, { timeoutMs: 120_000 });

		const auth = await seedCliAccessToken(E2E_SERVER_URL);
		await writeCliWorkerState(cyrusHome, auth.token);

		if (withWeb) {
			const web = spawnWeb(webEnv);
			processes.push(web);
			await waitForHttpOk(E2E_WEB_URL, { timeoutMs: 120_000 });
		}

		const cli = spawnCliWorker(cyrusHome, buildCliEnv(cyrusHome));
		processes.push(cli);
		await waitForWorkerConnected(cli);

		return { processes, cyrusHome, auth, wranglerEnvFile };
	});

	if (stackResult.isErr()) {
		(await Result.tryPromise(() => stopAll(processes))).tapError(() => {
			// best-effort cleanup after partial stack startup
		});
		(await Result.tryPromise(() => cleanupDevServerProcesses())).tapError(
			() => {
				// best-effort cleanup after partial stack startup
			}
		);
		await removeWranglerEnvFile(wranglerEnvFile);
	}

	return stackResult.unwrap();
}

export function startE2eStack(
	options: StartE2eStackOptions = {}
): Promise<E2eStack> {
	return createE2eStack(options);
}

export async function stopE2eStack(stack: E2eStack): Promise<void> {
	await stopAll(stack.processes);
	await cleanupDevServerProcesses();
	await removeWranglerEnvFile(stack.wranglerEnvFile);
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
