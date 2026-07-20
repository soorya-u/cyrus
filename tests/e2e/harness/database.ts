import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { waitForExit } from "./process";

const REPO_ROOT = join(fileURLToPath(new URL("../../..", import.meta.url)));

async function databaseHasSchema(databaseUrl: string): Promise<boolean> {
	const proc = spawn(
		"bun",
		[
			"-e",
			`import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const rows = await sql\`SELECT to_regclass('public.user') AS user_table\`;
process.exit(rows[0]?.user_table ? 0 : 1);`,
		],
		{
			cwd: join(REPO_ROOT, "apps/server"),
			env: { ...process.env, DATABASE_URL: databaseUrl },
			stdio: ["ignore", "ignore", "ignore"],
		}
	);
	return (await waitForExit(proc)) === 0;
}

export async function ensureDatabaseSchema(
	serverEnv: Record<string, string>
): Promise<void> {
	const databaseUrl = serverEnv.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required for E2E database setup.");
	}

	if (await databaseHasSchema(databaseUrl)) {
		return;
	}

	const proc = spawn("bunx", ["drizzle-kit", "push"], {
		cwd: join(REPO_ROOT, "apps/server"),
		env: { ...process.env, ...serverEnv },
		stdio: "inherit",
	});
	const exitCode = await waitForExit(proc);
	if (exitCode !== 0) {
		throw new Error("db:push failed for E2E database.");
	}
}
