import { join } from "node:path";
import { connection } from "@cyrus/database/connection";
import { connect } from "@tursodatabase/database";
import { DATABASE_FILE } from "@/constants/file";
import { env } from "@/lib/env";
import { ensureDir } from "@/utils/dir";

const STORE_DB_PATH = join(env.CYRUS_HOME, DATABASE_FILE);

export async function initDatabase() {
	await ensureDir();
	return connection.open(
		() => connect(STORE_DB_PATH, { timeout: 5000 }),
		"worker"
	);
}
