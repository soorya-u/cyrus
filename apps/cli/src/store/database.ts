import { connection } from "@cyrus/database/connection";
import { connect } from "@tursodatabase/database";
import { STORE_DB_PATH } from "@/constants/paths";
import { ensureDir } from "@/utils/fs";

export async function initDatabase() {
	await ensureDir();
	return connection.open(
		() => connect(STORE_DB_PATH, { timeout: 5000 }),
		"worker"
	);
}
