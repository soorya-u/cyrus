import { unlink } from "node:fs/promises";
import { Result } from "better-result";
import { PID_PATH } from "@/constants/paths";
import { ensureDir } from "./fs";

/** Whether a process with this pid is alive (signal 0 probes without killing). */
export function isAlive(pid: number): boolean {
	return Result.try(() => process.kill(pid, 0)).isOk();
}

export async function readPid(): Promise<number | null> {
	const file = Bun.file(PID_PATH);
	if (!(await file.exists())) {
		return null;
	}
	const pid = Number.parseInt((await file.text()).trim(), 10);
	return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export async function writePid(pid: number): Promise<void> {
	await ensureDir();
	await Bun.write(PID_PATH, String(pid));
}

export async function clearPid(): Promise<void> {
	await unlink(PID_PATH).catch(() => {
		// already gone
	});
}

/** The pid of the running worker, or null — clearing a stale pid file. */
export async function runningPid(): Promise<number | null> {
	const pid = await readPid();
	if (pid === null) {
		return null;
	}
	if (isAlive(pid)) {
		return pid;
	}
	await clearPid();
	return null;
}
