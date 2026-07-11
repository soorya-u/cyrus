import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { YAML } from "bun";
import { seedCliAccessToken } from "./auth";
import {
	buildCliEnv,
	buildServerEnv,
	buildWebEnv,
	createTempCyrusHome,
	E2E_SERVER_URL,
	E2E_WEB_URL,
} from "./env";
import {
	type ManagedProcess,
	spawnCliWorker,
	spawnServer,
	spawnWeb,
	stopAll,
} from "./spawn";
import { waitForHttpOk, waitForLogLine } from "./wait";

const REPO_ROOT = join(import.meta.dir, "../../..");
const CLI_CONNECTED_PATTERN = /connected/;

export type E2eStack = {
	processes: ManagedProcess[];
	cyrusHome: string;
	auth: Awaited<ReturnType<typeof seedCliAccessToken>>;
};

async function pushDatabaseSchema(
	serverEnv: Record<string, string>
): Promise<void> {
	const proc = Bun.spawn(["bun", "run", "db:push"], {
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

export async function startE2eStack(): Promise<E2eStack> {
	const serverEnv = buildServerEnv();
	const webEnv = buildWebEnv();
	const cyrusHome = await createTempCyrusHome();
	const processes: ManagedProcess[] = [];

	await pushDatabaseSchema(serverEnv);

	const server = spawnServer(serverEnv);
	processes.push(server);
	await waitForHttpOk(`${E2E_SERVER_URL}/health`);

	const auth = await seedCliAccessToken(E2E_SERVER_URL);
	await writeCliConfig(cyrusHome, auth.token, "e2e-worker-1", "E2E Worker");

	const web = spawnWeb(webEnv);
	processes.push(web);
	await waitForHttpOk(E2E_WEB_URL);

	const cli = spawnCliWorker(cyrusHome, buildCliEnv(cyrusHome));
	processes.push(cli);
	await waitForLogLine(
		cli.proc.stdout as ReadableStream<Uint8Array>,
		CLI_CONNECTED_PATTERN
	);

	return { processes, cyrusHome, auth };
}

export async function stopE2eStack(stack: E2eStack): Promise<void> {
	await stopAll(stack.processes);
}
