import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CYRUS_DIR = process.env.CYRUS_HOME ?? join(homedir(), ".cyrus");

export const paths = {
	dir: CYRUS_DIR,
	serverPid: join(CYRUS_DIR, "server.pid"),
	serverLog: join(CYRUS_DIR, "server.log"),
	serverEntry: join(import.meta.dirname, "../../server/src/index.ts"),
} as const;

export function ensureDir(): void {
	if (!existsSync(paths.dir)) {
		mkdirSync(paths.dir, { recursive: true });
	}
}
