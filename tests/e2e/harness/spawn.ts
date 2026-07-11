import { join } from "node:path";
import type { Subprocess } from "bun";

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

export function spawnServer(env: Record<string, string>): ManagedProcess {
	return spawnManaged(
		"server",
		["bunx", "wrangler", "dev", "--port", "8787", "--ip", "127.0.0.1"],
		{
			env: { ...process.env, ...env },
		}
	);
}

export function spawnWeb(env: Record<string, string>): ManagedProcess {
	return spawnManaged(
		"web",
		["bun", "run", "dev", "--", "--host", "localhost", "--port", "5173"],
		{
			cwd: join(REPO_ROOT, "apps/web"),
			env: { ...process.env, ...env },
		}
	);
}

export function spawnCliWorker(
	home: string,
	env: Record<string, string>
): ManagedProcess {
	return spawnManaged("cli-worker", ["bun", "src/cli.ts", "start"], {
		cwd: join(REPO_ROOT, "apps/cli"),
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
		["pkill", "-f", "wrangler dev --port 8787"],
		["pkill", "-f", "apps/web.*dev.*5173"],
	];
	for (const command of commands) {
		const proc = Bun.spawn(command, { stdout: "ignore", stderr: "ignore" });
		await proc.exited.catch(() => undefined);
	}
}
