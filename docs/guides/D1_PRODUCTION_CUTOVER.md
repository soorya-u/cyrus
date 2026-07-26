# D1 production cutover and rollback

Runbook for cutting the sync server (`apps/server`) off Neon Postgres onto Cloudflare D1, and for rolling back if the cutover fails. Completes the persistence migration tracked in #106 / #112.

## Preconditions

- Application repositories and better-auth already read/write through the Worker `DB` D1 binding (issues #109 and #110).
- This codebase no longer depends on `@neondatabase/serverless`, `pg`, or a `DATABASE_URL` env var — persistence is D1-only.
- `wrangler.json` declares the `cyrus` D1 database and points `migrations_dir` at `apps/server/src/db/migrations`.
- There is no production data that must be backfilled from Neon. If that changes before cutover, stop and add an explicit export/import step before continuing.
- Keep the existing GitHub `DATABASE_URL` secret (and Neon project) available until the cutover window succeeds, in case a Worker rollback still needs the old Neon-era deployment.

## Cutover

1. Confirm remote D1 exists and matches `wrangler.json`:

   ```sh
   wrangler d1 list
   wrangler d1 info cyrus
   ```

2. Apply pending SQLite migrations to remote D1 (idempotent). Deploy CI uses Wrangler directly:

   ```sh
   wrangler d1 migrations apply cyrus --remote --config wrangler.json
   ```

   Day-to-day schema work still uses the package scripts (`bun db:push`, `bun db:generate`, `bun db:migrate`, `bun db:studio`), which target D1 via `apps/server/drizzle.config.ts` (remote `d1-http` when Cloudflare credentials are set, otherwise `D1_LOCAL_DB`).

3. Deploy the Worker that binds `env.DB` and does not read `DATABASE_URL`:

   ```sh
   wrangler deploy --config wrangler.json
   ```

   Or rely on `.github/workflows/deploy.yml`, which applies remote D1 migrations then deploys without a `DATABASE_URL` secret.

4. Smoke-check production:

   ```sh
   curl -fsS "$WORKERS_URL/health"
   ```

   Expect HTTP 200 and `{"ok":true}`. Optionally run `tooling/test/smoke/deploy.ts` with the deploy smoke secrets.

5. Only after the cutover window is healthy: remove GitHub `DATABASE_URL` secrets from the `production` / `testing` environments and retire the Neon project. Until then, leave them in place solely to support rolling back to a pre-D1 Worker deployment.

## Rollback

Rollback restores a previous Worker deployment. Behavior depends on whether Neon has already been retired.

### During the cutover window (Neon still available)

1. List recent Worker deployments and roll back to the last known-good version:

   ```sh
   wrangler deployments list --config wrangler.json
   wrangler rollback --config wrangler.json
   ```

2. If that deployment still expected `DATABASE_URL`, ensure the Worker secret is still set, then re-check `/health` and auth (device login or deploy smoke).

3. D1 schema changes from step 2 of cutover are forward-only for D1-backed Workers. A Neon-era rollback does not undo D1 migrations; it simply stops serving from D1.

### After Neon is retired

Do not point this codebase at Neon — the driver and `DATABASE_URL` requirement have been removed. Fix forward with a corrected Worker deploy. If a bad D1 migration was applied and the current Worker cannot tolerate the schema, restore D1 from a Cloudflare/D1 backup or time-travel snapshot if available, or re-apply a known-good database.

## Local and CI notes

- Local `wrangler dev` and the E2E harness use Wrangler’s local D1. The harness applies migrations with `wrangler d1 migrations apply cyrus --local` before starting the server.
- Nightly E2E no longer requires a `DATABASE_URL` secret. Broader per-run D1 isolation policy for CI is tracked separately (#119).
