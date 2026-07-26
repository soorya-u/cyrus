import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { WRANGLER_PACKAGE } from "./dev-servers";
import { waitForExit } from "./process";

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));

/**
 * Applies pending local D1 migrations so wrangler-dev auth/app tables exist.
 * Neon schema push is obsolete after the D1 cutover (#106); #112 removes the
 * remaining DATABASE_URL requirement.
 */
export async function ensureDatabaseSchema(
	_serverEnv: Record<string, string>
): Promise<void> {
	const proc = spawn(
		"bunx",
		[WRANGLER_PACKAGE, "d1", "migrations", "apply", "cyrus", "--local"],
		{
			cwd: REPO_ROOT,
			env: process.env,
			stdio: "inherit",
		}
	);
	const exitCode = await waitForExit(proc);
	if (exitCode !== 0) {
		throw new Error(
			`wrangler d1 migrations apply --local failed with exit code ${exitCode ?? "null"}`
		);
	}
}
