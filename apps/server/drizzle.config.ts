import { defineConfig } from "drizzle-kit";
import { env } from "./src/db/env";

const dbConfig =
	env.DB_TYPE === "remote"
		? {
				driver: "d1-http" as const,
				dbCredentials: {
					accountId: env.CLOUDFLARE_ACCOUNT_ID,
					databaseId: env.CLOUDFLARE_DATABASE_ID,
					token: env.CLOUDFLARE_D1_TOKEN,
				},
			}
		: {
				dbCredentials: {
					url: env.D1_LOCAL_DB,
				},
			};

export default defineConfig({
	schema: "./src/db/models/index.ts",
	out: "./src/db/migrations",
	dialect: "sqlite",
	...dbConfig,
});
