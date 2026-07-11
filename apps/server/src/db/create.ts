import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type DbDriver = "neon-http" | "postgres-js";

type DbLogger = {
	logQuery: (query: string, params: unknown[]) => void;
};

export function resolveDbDriver(driver = process.env.DB_DRIVER): DbDriver {
	return driver === "postgres-js" ? "postgres-js" : "neon-http";
}

export function createPostgresDb(databaseUrl: string, logger?: DbLogger) {
	const client = postgres(databaseUrl, { max: 1 });
	return drizzlePostgres({
		client,
		...(logger ? { logger } : {}),
	});
}
