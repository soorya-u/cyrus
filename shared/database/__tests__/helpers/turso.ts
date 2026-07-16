import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect } from "@tursodatabase/database";
import { connection } from "../../src/connection";

export async function withTempDatabase<T>(run: () => Promise<T>): Promise<T> {
	// Shared-memory URI so schema survives connection.setup()'s bootstrap close/reopen.
	const dbPath = `file:cyrus-${randomUUID()}?mode=memory&cache=shared`;
	const tempDir = await mkdtemp(join(tmpdir(), "cyrus-db-test-"));
	const previousCwd = process.cwd();
	let opened = false;

	try {
		process.chdir(tempDir);
		const openResult = await connection.open(
			() => connect(dbPath, { timeout: 5000 }),
			"worker"
		);
		if (openResult.isErr()) throw openResult.error;
		opened = true;
		return await run();
	} finally {
		process.chdir(previousCwd);

		if (opened) {
			try {
				await connection.close();
			} catch {
				// connection may already be closed
			}
		}

		await rm(tempDir, { recursive: true, force: true });
	}
}
