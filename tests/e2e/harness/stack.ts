import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Result } from "better-result";
import { YAML } from "bun";
import { seedCliAccessToken } from "./auth";
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

const REPO_ROOT = join(import.meta.dir, "../../..");
const CLI_CONNECTED_PATTERN = /connected.*waiting for message/i;

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

async function databaseHasSchema(databaseUrl: string): Promise<boolean> {
	const proc = Bun.spawn(
		[
			"bun",
			"-e",
			`import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const rows = await sql\`SELECT to_regclass('public.user') AS user_table\`;
process.exit(rows[0]?.user_table ? 0 : 1);`,
		],
		{
			cwd: join(REPO_ROOT, "apps/server"),
			env: { ...process.env, DATABASE_URL: databaseUrl },
			stdout: "ignore",
			stderr: "ignore",
		}
	);
	return (await proc.exited) === 0;
}

async function pushDatabaseSchema(
	serverEnv: Record<string, string>
): Promise<void> {
	const databaseUrl = serverEnv.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required for E2E database setup.");
	}

	if (await databaseHasSchema(databaseUrl)) {
		return;
	}

	const proc = Bun.spawn(["bunx", "drizzle-kit", "push"], {
		cwd: join(REPO_ROOT, "apps/server"),
		env: { ...process.env, ...serverEnv },
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error("db:push failed for E2E database.");
	}
}

async function writeCliConfig(
	home: string,
	token: string,
	workerId: string,
	workerName: string
): Promise<void> {
	await writeFile(
		join(home, "config.yml"),
		YAML.stringify({ token, id: workerId, name: workerName }),
		{ mode: 0o600 }
	);
}

async function writeCliAgents(home: string): Promise<void> {
	await writeFile(
		join(home, "agents.yml"),
		YAML.stringify({
			"claude-acp": {
				registryId: "claude-acp",
				name: "Claude Agent",
				icon: "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg",
			},
		}),
		{ mode: 0o600 }
	);
}

async function waitForWorkerConnected(
	cli: ManagedProcess,
	timeoutMs = 120_000
): Promise<void> {
	if (!(cli.proc.stdout && cli.proc.stderr)) {
		throw new Error(
			"CLI worker stdout/stderr must be piped for E2E readiness."
		);
	}

	await waitForLogLine(
		cli.proc.stdout,
		cli.proc.stderr,
		CLI_CONNECTED_PATTERN,
		timeoutMs
	);
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
		await pushDatabaseSchema(serverEnv);

		wranglerEnvFile = await writeWranglerEnvFile(serverEnv);
		const server = spawnServer(serverEnv, wranglerEnvFile);
		processes.push(server);
		await waitForHttpOk(`${E2E_SERVER_URL}/health`, { timeoutMs: 120_000 });

		const auth = await seedCliAccessToken(E2E_SERVER_URL);
		await writeCliConfig(cyrusHome, auth.token, "e2e-worker-1", "E2E Worker");
		await writeCliAgents(cyrusHome);

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
