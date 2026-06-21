import { env } from "@cyrus/env/server";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
