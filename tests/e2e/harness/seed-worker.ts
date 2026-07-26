import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { seedCliAccessToken } from "./auth";
import { writeCliWorkerState } from "./cli-worker";
import { E2E_AUTH_FILE, E2E_SERVER_URL } from "./env";

const home = process.env.CYRUS_HOME;
if (!home) {
	throw new Error("CYRUS_HOME is required to seed the E2E worker.");
}

/**
 * Playwright writes auth + worker state before starting the worker process.
 * Skip the HTTP device-flow shortcut when that file is already present.
 */
const authPath = join(home, E2E_AUTH_FILE);
try {
	await access(authPath);
	process.exit(0);
} catch {
	// Fall through to Vitest HTTP seed until #118 retires it.
}

const auth = await seedCliAccessToken(E2E_SERVER_URL);
await writeCliWorkerState(home, auth.token);
await writeFile(authPath, `${JSON.stringify(auth, null, 2)}\n`, {
	mode: 0o600,
});
