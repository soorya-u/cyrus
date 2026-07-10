import { closeSync, openSync, readFileSync, unlinkSync } from "node:fs";
import { Result } from "better-result";
import { env } from "@/lib/env";
import { ensureDir } from "@/utils/dir";
import {
	clearPid,
	isAlive,
	LOG_PATH,
	PID_PATH,
	runningPid,
	writePid,
} from "@/utils/process";
import { print } from "@/utils/style";

type StartOptions = { bg?: boolean };

async function runWorker(): Promise<void> {
	const ownPid = process.pid;
	process.on("exit", () => {
		Result.try(() => {
			const stored = Number.parseInt(readFileSync(PID_PATH, "utf8").trim(), 10);
			if (stored === ownPid) unlinkSync(PID_PATH);
		});
	});
	const { worker } = await import("./worker");
	await worker();
}

export async function start(opts: StartOptions): Promise<void> {
	if (env.CYRUS_DAEMON) return await runWorker();

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
		if (child.pid) await writePid(child.pid);

		// brief wait to catch immediate startup failures (e.g. not logged in)
		await Bun.sleep(300);
		if (child.pid && !isAlive(child.pid)) {
			await clearPid();
			print.error`Worker failed to start. Check logs: ${LOG_PATH}`;
			process.exit(1);
		}
		print.success`✓ started in background (pid ${child.pid}). Logs: ${LOG_PATH}`;
		return;
	}

	await writePid(process.pid);
	await runWorker();
}
