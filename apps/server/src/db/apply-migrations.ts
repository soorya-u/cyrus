import { applyD1Migrations, env } from "cloudflare:test";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";

type TestEnv = Cloudflare.Env & { TEST_MIGRATIONS: D1Migration[] };

// Setup runs outside isolated storage and may run multiple times.
// applyD1Migrations only applies migrations that haven't already been applied.
await applyD1Migrations(env.DB, (env as TestEnv).TEST_MIGRATIONS);
