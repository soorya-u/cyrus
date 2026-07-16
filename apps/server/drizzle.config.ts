import { defineConfig } from "drizzle-kit";

// Read DATABASE_URL directly (not full server env) so migrate/push stay lightweight.
// Fallback keeps the file loadable for tools that import the config (e.g. Knip).
export default defineConfig({
	schema: "./src/db/models",
	out: "./src/db/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "postgresql://localhost/unused",
	},
});
