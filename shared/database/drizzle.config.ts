import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/models/index.ts",
	dialect: "turso",
	dbCredentials: {
		url: "file:store.db",
	},
});
