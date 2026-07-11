import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CyrusPaths, createCyrusPaths } from "../../src/constants/paths";

export async function withIsolatedCyrusPaths<T>(
	run: (paths: CyrusPaths) => Promise<T>
): Promise<T> {
	const home = await mkdtemp(join(tmpdir(), "cyrus-test-"));
	const paths = createCyrusPaths(home);

	try {
		return await run(paths);
	} finally {
		await rm(home, { recursive: true, force: true });
	}
}
