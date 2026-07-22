# Testing Strategy

Cyrus uses a layered test setup so each part of the system is tested with the runtime closest to production.

## Runners

| Scope | Runner | Location |
| --- | --- | --- |
| Pure TypeScript, schemas, CLI, database, process tests | Bun test | Colocated `*.test.ts` or package `__tests__/integration/` |
| `apps/web`, `shared/hooks`, `shared/providers` | Vitest + jsdom | Package-local `vitest.config.ts`; shared setup in `tooling/test/setup/vitest.shared.ts` |
| `apps/server` | Vitest with `@cloudflare/vitest-pool-workers` | Colocated `src/**/*.test.ts` |
| Harness-driven E2E scenarios | Vitest + node | Root `tests/e2e/scenarios/` |
| Browser user flows | Playwright | Root `tests/e2e/web/` |

Vitest is the default runner (ADR 0017). Bun stays permanently for `apps/cli` and `apps/desktop`; remaining Bun suites elsewhere migrate under #88.

In `apps/web`, `shared/hooks`, and `shared/providers`, every colocated `*.test.ts` and `*.test.tsx` suite runs on that package's Vitest + jsdom project. Each package's `test:unit` is `vitest run`. The shared Vitest setup registers Testing Library jest-dom matchers and cleans up the DOM after each test.

## Layout

```text
<package>/src/**/*.test.ts
<package>/__tests__/integration/
tests/e2e/harness/
tests/e2e/scenarios/
tests/e2e/web/
tooling/test/
```

Unit tests stay close to the code they cover. In `apps/server`, every colocated `*.test.ts` runs on the Cloudflare Workers pool via `vitest`. Integration tests live under the package boundary they exercise. Cross-app tests live at the repo root.

## CI Levels

| Level | Trigger | Tests |
| --- | --- | --- |
| 0 | pre-commit | Ultracite only |
| 1 | pre-push | Typecheck and unit tests |
| 2 | pull request | Lint, typecheck, unit tests |
| 3 | main or nightly | Integration and E2E |
| 4 | deploy | Health and WebSocket smoke |

Phase 1 only adds the unit test foundation. Integration and E2E are introduced in later phases.

## Phase 4 notes

- Root Vitest scenarios live in `tests/e2e/scenarios/` behind `NODE_ENV=testing`. The thread lifecycle scenario replaces the old draft manual check, and catalog RPC checks run automatically as `catalog.test.ts`.
- The harness in `tests/e2e/harness/` starts `wrangler dev`, `vite`, and an isolated `CYRUS_HOME` CLI worker against a **Neon branch** (`DATABASE_URL`).
- Scenarios can call `stack.restartWorker()` to replace only the CLI worker while preserving the server, authentication, and isolated `CYRUS_HOME`. `cold-resume.test.ts` uses this to verify a thread resumes with its persisted session after a worker restart.
- The Playwright suite uses Playwright's lifecycle primitives rather than the Bun scenario stack:
  1. Playwright's `webServer` configuration ensures the database schema exists, then starts the real Wrangler signaling server on `:8787` and Vite controller on `:5173`.
  2. The worker-scoped `auth` fixture creates a unique account, completes the real device authorization flow, and exposes the session cookie and CLI access token to each spec.
  3. The worker-scoped `cliWorker` fixture writes that token to an isolated `CYRUS_HOME`, starts the CLI Worker, and waits for its `connected... waiting for message` log line.
  4. Specs install the fixture's session cookie in the browser and exercise the controller against the connected CLI Worker.
  5. After the worker's tests finish, Playwright stops the CLI Worker, removes its temporary home, and tears down both `webServer` processes.
- Local E2E runs may use the existing Neon `test` branch. Authenticate and link the repository with `neonctl`, then derive the required connection string:

  ```sh
  export DATABASE_URL="$(neonctl connection-string test --pooled)"
  ```

  Do not use the development or production branch for E2E runs. Tests may mutate data, so use unique records and do not assume the shared `test` branch is empty.
- The Vitest harness and Playwright server setup ensure the schema exists before starting their signaling server; nightly CI should use an isolated branch per run via the `DATABASE_URL` secret in the `testing` environment.
- Programmatic auth uses Better Auth email sign-in plus the real device-code flow (`tests/e2e/harness/auth.ts`). Email/password auth is enabled when the server runs with `NODE_ENV=testing`.
- Playwright specs and their worker-scoped fixtures live in `tests/e2e/web/`.
- E2E runs manually via `.github/workflows/nightly.yml` (`workflow_dispatch` only). The job uses the GitHub `testing` environment and its `DATABASE_URL` secret.

## Phase 5 notes

- Deploy smoke runs after every server deploy via `tooling/test/smoke/deploy.ts`. Optional `DEPLOY_SMOKE_TOKEN` and `DEPLOY_SMOKE_ROOM_ID` secrets enable a signaling WebSocket check in addition to `GET /health`.
- Nightly also runs build smoke (`build:web`, CLI compile) and real `node-datachannel` checks (`CYRUS_NIGHTLY_WEBRTC=1`).
- `pre-push` now runs `test:unit` locally; integration and E2E stay in CI only.

## OpenSpec coverage map

| OpenSpec | Nearest automated tests |
| --- | --- |
| `conversation-view` | `shared/utils/src/fold.test.ts` |
| `wire-schemas` | `shared/schemas/src/**/*.test.ts` |
| `acp-provider-cli` | `apps/cli/src/core/acp/events.test.ts`, `run-turn.test.ts` |
| `acp-session-router` | `apps/cli/__tests__/integration/wiring.test.ts` |
| `connection-providers` | `shared/connections/src/rtc/session.test.ts` |
| `conversation-persistence` | `shared/database/__tests__/integration/repositories.test.ts` |

## Deferred platform tracks

- `@cyrus/desktop` — thin Bun unit tests for `lib/env` and `lib/auth`; browser E2E can reuse the web Playwright suite against built assets.
- `@cyrus/mobile` — Maestro or Detox when the app matures.
- `@cyrus/styles` — out of scope for unit tests.
- Visual regression — deferred.

## Phase 3 notes

- ACP prompt mocking lives in `apps/cli/__tests__/helpers/acp-runtime.ts`.
- CLI integration tests use isolated `CYRUS_HOME` directories and subprocess checks.
- Hooks tests currently cover the optimistic conversations cache contract used by `use-controller-threads`.

- `@cyrus/database` integration tests use isolated in-memory Turso databases via `shared/database/__tests__/helpers/turso.ts`.
- `@cyrus/server` integration tests (issue #31) use a **Neon branch** with the production `neon-http` driver (`@neondatabase/serverless`). Set `DATABASE_URL` to the branch connection string — no alternate driver or Docker Postgres.
- Create an isolated Neon branch per CI job or nightly run; point `DATABASE_URL` at it and run `bun db:push` before the suite.
