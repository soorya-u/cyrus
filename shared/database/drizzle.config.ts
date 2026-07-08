import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/models/index.ts",
	dialect: "turso",
	dbCredentials: {
		url: process.env.DATABASE_PATH ?? "file:store.db",
	},
});
