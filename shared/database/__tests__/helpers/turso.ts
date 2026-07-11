import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect } from "@tursodatabase/database";
import { connection } from "../../src/connection";

export async function withTempDatabase<T>(run: () => Promise<T>): Promise<T> {
	const dir = await mkdtemp(join(tmpdir(), "cyrus-db-test-"));
	const dbPath = join(dir, "test.db");

	try {
		await connection.open(() => connect(dbPath, { timeout: 5000 }), "worker");
		return await run();
	} finally {
		await connection.close();
		await rm(dir, { recursive: true, force: true });
	}
}
