import { defineConfig } from "drizzle-kit";
import { env } from "./src/db/env";

const remote = "accountId" in env;

export default defineConfig({
	schema: "./src/db/models/index.ts",
	out: "./src/db/migrations",
	dialect: "sqlite",
	...(remote ? { driver: "d1-http" as const } : {}),
	dbCredentials: env,
});
