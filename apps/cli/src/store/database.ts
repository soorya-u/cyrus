import { connection, type DrizzleDb } from "@cyrus/database/connection";
import type { RepositoryError } from "@cyrus/errors/repository";
import { connect } from "@tursodatabase/database";
import type { Result } from "better-result";
import { STORE_DB_PATH } from "@/constants/paths";
import { ensureDir } from "@/utils/fs";

export async function initDatabase(): Promise<
	Result<DrizzleDb, RepositoryError>
> {
	await ensureDir();
	return connection.open(
		() => connect(STORE_DB_PATH, { timeout: 5000 }),
		"worker"
	);
}
