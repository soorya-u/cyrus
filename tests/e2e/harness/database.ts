import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "../../..");

async function databaseHasSchema(databaseUrl: string): Promise<boolean> {
	const proc = Bun.spawn(
		[
			"bun",
			"-e",
			`import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const rows = await sql\`SELECT to_regclass('public.user') AS user_table\`;
process.exit(rows[0]?.user_table ? 0 : 1);`,
		],
		{
			cwd: join(REPO_ROOT, "apps/server"),
			env: { ...process.env, DATABASE_URL: databaseUrl },
			stdout: "ignore",
			stderr: "ignore",
		}
	);
	return (await proc.exited) === 0;
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

	const proc = Bun.spawn(["bunx", "drizzle-kit", "push"], {
		cwd: join(REPO_ROOT, "apps/server"),
		env: { ...process.env, ...serverEnv },
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error("db:push failed for E2E database.");
	}
}
