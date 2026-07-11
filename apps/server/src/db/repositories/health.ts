import { Result } from "better-result";
import { sql } from "drizzle-orm";
import { log } from "evlog";
import { db } from "../index";

export const checkHealth = async () =>
	(await Result.tryPromise(() => db.execute(sql`SELECT 1`))).match({
		ok: () => true,
		err: (error) => {
			log.error({ action: "database-health-check-failed", error });
			return false;
		},
	});
