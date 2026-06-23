import { sql } from "drizzle-orm";

import { db } from "../index";

export const checkHealth = async () => {
	const result = await db.execute(sql`SELECT 1`);
	return result.rows.length > 0;
};
