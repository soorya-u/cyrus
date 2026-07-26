import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { waitForExit } from "./process";

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));

export async function ensureDatabaseSchema(): Promise<void> {
	const proc = spawn(
		"bunx",
		[
			"wrangler@4.104.0",
			"d1",
			"migrations",
			"apply",
			"cyrus",
			"--local",
			"--config",
			"wrangler.json",
		],
		{
			cwd: REPO_ROOT,
			env: process.env,
			stdio: "inherit",
		}
	);
	const exitCode = await waitForExit(proc);
	if (exitCode !== 0) {
		throw new Error("D1 local migrations failed for E2E database setup.");
	}
}
