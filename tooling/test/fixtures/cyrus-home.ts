import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Temp `CYRUS_HOME` directory for a single test run. */
export function createTempCyrusHome(prefix: string): Promise<string> {
	return mkdtemp(join(tmpdir(), prefix));
}

type AfterEachHook = (fn: () => unknown) => void;

export function tempCyrusHomeFixture(
	afterEachHook: AfterEachHook,
	prefix: string
): () => Promise<string> {
	const homes: string[] = [];

	afterEachHook(async () => {
		await Promise.all(
			homes.splice(0).map((home) => rm(home, { recursive: true, force: true }))
		);
	});

	return async () => {
		const home = await createTempCyrusHome(prefix);
		homes.push(home);
		return home;
	};
}
