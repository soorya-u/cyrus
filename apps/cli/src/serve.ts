import { spawn } from "node:child_process";
import {
	closeSync,
	existsSync,
	openSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { resolve as resolvePath } from "node:path";
import { ensureDir, paths } from "./paths";

export interface ServeOptions {
	detached: boolean;
	port: number;
}

export function isRunning(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

export function readPid(): number | null {
	if (!existsSync(paths.serverPid)) {
		return null;
	}
	const raw = readFileSync(paths.serverPid, "utf8").trim();
	const pid = Number.parseInt(raw, 10);
	return Number.isFinite(pid) && pid > 0 ? pid : null;
}

export function startServer(opts: ServeOptions): { pid: number } {
	ensureDir();
	const existing = readPid();
	if (existing && isRunning(existing)) {
		throw new Error(`server already running (pid ${existing})`);
	}

	const entry = resolvePath(paths.serverEntry);
	const env = { ...process.env, PORT: String(opts.port) } as NodeJS.ProcessEnv;

	if (opts.detached) {
		const logFd = openSync(paths.serverLog, "a");
		const child = spawn("bun", [entry], {
			env,
			detached: true,
			stdio: ["ignore", logFd, logFd],
		});
		child.unref();
		closeSync(logFd);
		writeFileSync(paths.serverPid, String(child.pid));
		return { pid: child.pid ?? -1 };
	}

	// Foreground: stream logs to stdout/stderr and write to log file.
	const child = spawn("bun", [entry], {
		env,
		stdio: ["inherit", "pipe", "pipe"],
	});
	child.stdout?.on("data", (d) => process.stdout.write(d));
	child.stderr?.on("data", (d) => process.stderr.write(d));
	writeFileSync(paths.serverPid, String(child.pid));
	child.on("exit", (code) => {
		try {
			rmSync(paths.serverPid, { force: true });
		} catch {
			/* ignore */
		}
		process.exit(code ?? 0);
	});
	return { pid: child.pid ?? -1 };
}

export function stopServer(): boolean {
	const pid = readPid();
	if (!(pid && isRunning(pid))) {
		return false;
	}
	process.kill(pid, "SIGTERM");
	return true;
}

export interface ServerStatus {
	log: string | null;
	pid: number | null;
	port: number | null;
	running: boolean;
	uptimeMs: number | null;
}

export function serverStatus(): ServerStatus {
	const pid = readPid();
	const running = pid != null && isRunning(pid);
	let uptimeMs: number | null = null;
	if (running && existsSync(paths.serverPid)) {
		try {
			uptimeMs = Date.now() - statSync(paths.serverPid).mtimeMs;
		} catch {
			/* ignore */
		}
	}
	const port = running ? Number(process.env.PORT ?? 3000) : null;
	const log = existsSync(paths.serverLog) ? paths.serverLog : null;
	return { running, pid, port, uptimeMs, log };
}
