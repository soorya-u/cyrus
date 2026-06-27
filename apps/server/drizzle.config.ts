import { defineConfig } from "drizzle-kit";

// Migrations only need the DB URL — read it directly rather than importing the
// full server env, so `db:migrate` doesn't require runtime-only vars/secrets.
const url = process.env.DATABASE_URL;
if (!url) {
	throw new Error("DATABASE_URL is required to run migrations");
}

export default defineConfig({
	schema: "./src/db/models",
	out: "./src/db/migrations",
	dialect: "postgresql",
	dbCredentials: { url },
});
