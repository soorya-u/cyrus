import { Result } from "better-result";
import { sql } from "drizzle-orm";
import { log } from "evlog";
import { db } from "../index";

export const checkHealth = async () =>
	(await Result.tryPromise(() => db.run(sql`SELECT 1`)))
		.map(() => true)
		.tapError((error) =>
			log.error({ action: "database-health-check-failed", error })
		)
		.unwrapOr(false);
