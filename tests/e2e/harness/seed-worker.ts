import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { seedCliAccessToken } from "./auth";
import { writeCliWorkerState } from "./cli-worker";
import { E2E_SERVER_URL } from "./env";

const home = process.env.CYRUS_HOME;
if (!home) {
	throw new Error("CYRUS_HOME is required to seed the E2E worker.");
}

const auth = await seedCliAccessToken(E2E_SERVER_URL);
await writeCliWorkerState(home, auth.token);
await writeFile(
	join(home, "e2e-auth.json"),
	`${JSON.stringify(auth, null, 2)}\n`,
	{
		mode: 0o600,
	}
);
