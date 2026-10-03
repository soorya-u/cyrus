import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: [
		"./src/models/conversations.ts",
		"./src/models/projects.ts",
		"./src/models/threads.ts",
	],
	out: "./migrations",
	dialect: "turso",
	dbCredentials: {
		url: process.env.DATABASE_PATH ?? "file:store.db",
	},
});
