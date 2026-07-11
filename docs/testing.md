# Testing Strategy

Cyrus uses a layered test setup so each part of the system is tested with the
runtime closest to production.

## Runners

| Scope | Runner | Location |
| --- | --- | --- |
| Pure TypeScript, schemas, CLI, database, process tests | Bun test | Colocated `*.test.ts` or package `__tests__/integration/` |
| React hooks, providers, Cloudflare Workers runtime | Vitest | Package-local `vitest.config.ts` |
| Browser user flows | Playwright | Root `tests/e2e/web/` |

Bun test is the default. Use Vitest when the package needs a browser-like React
test environment or the Cloudflare Workers test pool.

## Layout

```text
<package>/src/**/*.test.ts
<package>/__tests__/integration/
tests/e2e/harness/
tests/e2e/scenarios/
tests/e2e/web/
tooling/test/
```

Unit tests stay close to the code they cover. Integration tests live under the
package boundary they exercise. Cross-app tests live at the repo root.

## CI Levels

| Level | Trigger | Tests |
| --- | --- | --- |
| 0 | pre-commit | Ultracite only |
| 1 | pre-push | Typecheck now; unit tests once stable |
| 2 | pull request | Lint, typecheck, unit tests |
| 3 | main or nightly | Integration and E2E |
| 4 | deploy | Health and WebSocket smoke |

Phase 1 only adds the unit test foundation. Integration and E2E are introduced
in later phases.

## Phase 4 notes

- Root Bun scenarios live in `tests/e2e/scenarios/` behind `CYRUS_E2E=1`.
- The harness in `tests/e2e/harness/` starts `wrangler dev`, `vite`, and an
  isolated `CYRUS_HOME` CLI worker against a **Neon branch** (`DATABASE_URL`).
- Run `bun db:push` against the branch before the suite; nightly CI should use an
  isolated branch per run via the `NEON_DATABASE_URL` secret.
- Programmatic auth uses Better Auth email sign-in plus the real device-code
  flow (`tests/e2e/harness/auth.ts`). Server email auth is enabled only when
  `ENABLE_E2E_AUTH=1`.
- Playwright specs live in `tests/e2e/web/` and reuse the same harness-managed
  stack.
- E2E runs manually via `.github/workflows/nightly.yml` (`workflow_dispatch`
  only for now; push/schedule triggers disabled until Neon CI is wired).

## Phase 3 notes

- ACP prompt mocking lives in `apps/cli/__tests__/helpers/acp-runtime.ts`.
- CLI integration tests use isolated `CYRUS_HOME` directories and subprocess checks.
- Hooks tests currently cover the optimistic conversations cache contract used by
  `use-controller-threads`.

- `@cyrus/database` integration tests use isolated in-memory Turso databases via
  `shared/database/__tests__/helpers/turso.ts`.
- `@cyrus/server` integration tests (issue #31) use a **Neon branch** with the
  production `neon-http` driver (`@neondatabase/serverless`). Set `DATABASE_URL`
  to the branch connection string — no alternate driver or Docker Postgres.
- Create an isolated Neon branch per CI job or nightly run; point
  `DATABASE_URL` at it and run `bun db:push` before the suite.
