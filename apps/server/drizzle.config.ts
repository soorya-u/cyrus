import { defineConfig } from "drizzle-kit";
import { env } from "./src/db/env";

const { driver, ...dbCredentials } = env;

export default defineConfig({
	schema: "./src/db/models/index.ts",
	out: "./src/db/migrations",
	dialect: "sqlite",
	driver,
	dbCredentials,
});
