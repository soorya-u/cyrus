import { closeSync, openSync, unlinkSync } from "node:fs";
import { Result } from "better-result";
import { env } from "@/lib/env";
import { ensureDir } from "@/utils/dir";
import { LOG_PATH, PID_PATH, runningPid, writePid } from "@/utils/process";
import { print } from "@/utils/style";

type StartOptions = { bg?: boolean };

async function runWorker(): Promise<void> {
	process.on("exit", () => Result.try(() => unlinkSync(PID_PATH)));

	const { worker } = await import("./worker");
	await worker();
}

export async function start(opts: StartOptions): Promise<void> {
	if (env.CYRUS_DAEMON) {
		await runWorker();
		return;
	}

	const running = await runningPid();
	if (running !== null) {
		print.error`Already running (pid ${running}). Run \`cyrusd stop\` first.`;
		process.exit(1);
	}

	if (opts.bg) {
		await ensureDir();
		const log = openSync(LOG_PATH, "a");
		const child = Bun.spawn([Bun.main, "start"], {
			detached: true,
			stdio: ["ignore", log, log],
			env: { ...process.env, CYRUS_DAEMON: "1" },
		});
		closeSync(log);
		child.unref();
		if (child.pid) {
			await writePid(child.pid);
		}
		print.success`✓ started in background (pid ${child.pid}). Logs: ${LOG_PATH}`;
		return;
	}

	await writePid(process.pid);
	await runWorker();
}
