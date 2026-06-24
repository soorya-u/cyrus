import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { log } from "evlog";
import { env } from "../config/env";
// biome-ignore lint/performance/noNamespaceImport: drizzle adapter requires schema as namespace
import * as models from "./models";

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, {
	schema: models,
	logger: {
		logQuery: (query, params) =>
			log.debug({
				action: "db-query",
				query,
				params,
			}),
	},
});
