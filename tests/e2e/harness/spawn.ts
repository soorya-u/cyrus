import { join } from "node:path";
import type { Subprocess } from "bun";
import { CLI_WORKER_COMMAND, CLI_WORKER_DIRECTORY } from "./cli-worker";
import { WEB_DEV_COMMAND, WRANGLER_DEV_COMMAND } from "./dev-servers";

const REPO_ROOT = join(import.meta.dir, "../../..");

export type ManagedProcess = {
	proc: Subprocess;
	name: string;
};

export function spawnManaged(
	name: string,
	command: string[],
	options: {
		cwd?: string;
		env?: Record<string, string | undefined>;
		stdout?: "pipe" | "inherit";
		stderr?: "pipe" | "inherit";
	} = {}
): ManagedProcess {
	const proc = Bun.spawn(command, {
		cwd: options.cwd ?? REPO_ROOT,
		env: options.env,
		stdout: options.stdout ?? "pipe",
		stderr: options.stderr ?? "pipe",
	});

	return { proc, name };
}

export function spawnServer(
	env: Record<string, string>,
	envFile: string
): ManagedProcess {
	return spawnManaged(
		"server",
		[...WRANGLER_DEV_COMMAND, "--env-file", envFile],
		{
			env: { ...process.env, ...env },
		}
	);
}

export function spawnWeb(env: Record<string, string>): ManagedProcess {
	return spawnManaged("web", [...WEB_DEV_COMMAND], {
		cwd: join(REPO_ROOT, "apps/web"),
		env: { ...process.env, ...env },
	});
}

export function spawnCliWorker(
	home: string,
	env: Record<string, string>
): ManagedProcess {
	return spawnManaged("cli-worker", [...CLI_WORKER_COMMAND], {
		cwd: CLI_WORKER_DIRECTORY,
		env: { ...process.env, ...env, CYRUS_HOME: home, CYRUS_DAEMON: "1" },
	});
}

export async function stopManaged(process: ManagedProcess): Promise<void> {
	if (process.proc.exitCode !== null) {
		return;
	}

	process.proc.kill();
	await process.proc.exited.catch(() => undefined);
}

export async function stopAll(processes: ManagedProcess[]): Promise<void> {
	await Promise.all(processes.map((process) => stopManaged(process)));
}

export async function cleanupDevServerProcesses(): Promise<void> {
	const commands = [
		["pkill", "-f", "wrangler@4.104.0 dev --config wrangler.json"],
		["pkill", "-f", "wrangler dev"],
		["pkill", "-f", "--host 127.0.0.1 --port 5173"],
		["pkill", "-f", "--host localhost --port 5173"],
	];
	for (const command of commands) {
		const proc = Bun.spawn(command, { stdout: "ignore", stderr: "ignore" });
		await proc.exited.catch(() => undefined);
	}
}
