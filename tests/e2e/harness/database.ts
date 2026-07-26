import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { WRANGLER_PACKAGE } from "./dev-servers";
import { waitForExit } from "./process";

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));

/** Applies pending local D1 migrations so wrangler-dev auth/app tables exist. */
export async function ensureDatabaseSchema(): Promise<void> {
	const proc = spawn(
		"bunx",
		[
			WRANGLER_PACKAGE,
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
		throw new Error(
			`D1 local migrations failed for E2E database setup (exit ${exitCode ?? "null"}).`
		);
	}
}
