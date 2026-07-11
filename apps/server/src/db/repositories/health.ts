import { sql } from "drizzle-orm";

import { db } from "../index";

export const checkHealth = async () => {
	try {
		await db.execute(sql`SELECT 1`);
		return true;
	} catch {
		return false;
	}
};
