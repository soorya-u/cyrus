import { drizzle } from "drizzle-orm/neon-http";
import { log } from "evlog";
import { env } from "../config/env";

export const db = drizzle(env.DATABASE_URL, {
	logger: {
		logQuery: (query, params) =>
			log.debug({
				action: "db-query",
				query,
				params,
			}),
	},
});
