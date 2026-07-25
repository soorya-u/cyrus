import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { log } from "evlog";

export const db = drizzle(env.DB, {
	logger: {
		logQuery: (query, params) =>
			log.debug({
				action: "db-query",
				query,
				params,
			}),
	},
});
