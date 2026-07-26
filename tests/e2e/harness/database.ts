import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { WRANGLER_PACKAGE } from "./dev-servers";
import { waitForExit } from "./process";

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));

/** Env var shared by prepare-database and `wrangler dev` for one E2E stack run. */
export const WRANGLER_PERSIST_TO_ENV = "WRANGLER_PERSIST_TO";

/** Temp Miniflare/D1 state directory for a single E2E stack run. */
export function createTempWranglerPersistDir(): Promise<string> {
	return mkdtemp(join(tmpdir(), "cyrus-e2e-wrangler-"));
}

export function requireWranglerPersistTo(
	env: NodeJS.ProcessEnv = process.env
): string {
	const persistTo = env[WRANGLER_PERSIST_TO_ENV]?.trim();
	if (!persistTo) {
		throw new Error(
			`${WRANGLER_PERSIST_TO_ENV} is required for E2E local D1 isolation.`
		);
	}
	return persistTo;
}

/** Args for applying D1 migrations into a run-scoped local persist directory. */
export function buildD1MigrateLocalArgs(persistTo: string): string[] {
	return [
		WRANGLER_PACKAGE,
		"d1",
		"migrations",
		"apply",
		"cyrus",
		"--local",
		"--persist-to",
		persistTo,
		"--config",
		"wrangler.json",
	];
}

/** Applies pending local D1 migrations so wrangler-dev auth/app tables exist. */
export async function ensureDatabaseSchema(
	persistTo = requireWranglerPersistTo()
): Promise<void> {
	const proc = spawn("bunx", buildD1MigrateLocalArgs(persistTo), {
		cwd: REPO_ROOT,
		env: process.env,
		stdio: "inherit",
	});
	const exitCode = await waitForExit(proc);
	if (exitCode !== 0)
		throw new Error(
			`D1 local migrations failed for E2E database setup (exit ${exitCode ?? "null"}).`
		);
}
