# Testing Strategy

Cyrus uses a layered test setup so each part of the system is tested with the runtime closest to production.

## Runners

| Scope | Runner | Location |
| --- | --- | --- |
| `apps/cli`, `apps/desktop` | Bun test | Colocated `*.test.ts` or package `__tests__/integration/` |
| Vitest workspace packages (`apps/web`, `apps/server`, `shared/*`) | Root Vitest Projects | `vitest.config.ts` at the repo root; shared DOM setup in `tooling/test/setup/vitest.shared.ts` |
| Worker CLI terminal tier | Vitest + shell-use (PTY) | Root `tests/e2e/harness/*-terminal.test.ts` |
| Cross-peer + browser user flows | Playwright | Root `tests/e2e/web/` (process-compose lifecycle) |

Vitest is the default runner (ADR 0017). Bun stays permanently for `apps/cli` and `apps/desktop`.

Root `bun test:unit` runs `vitest run --project='@cyrus/*'` (every unit project; `e2e` and `database-integration` sit outside that glob) plus `apps/cli`'s Bun unit suite. Use `vitest run --project <name>` to scope a single project. DOM packages (`apps/web`, `shared/hooks`, `shared/providers`) share Testing Library jest-dom matchers and DOM cleanup via `@cyrus/test/setup/vitest.shared`.

## Layout

```text
<package>/src/**/*.test.ts
<package>/__tests__/integration/
tests/e2e/harness/
tests/e2e/web/
tooling/test/
```

Unit tests stay close to the code they cover. In `apps/server`, every colocated `*.test.ts` runs on the Cloudflare Workers pool via the root Vitest workspace. Integration tests live under the package boundary they exercise. Cross-app tests live at the repo root.

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

- Cross-peer scenarios live under `tests/e2e/web/specs/` (`worker-connects`, `catalog`, `thread-lifecycle`, `thread-sync`, `cold-resume`) and run on Playwright with a real browser as the Controller.
- The harness in `tests/e2e/harness/` plus `tests/e2e/process-compose.yaml` starts `wrangler dev`, `vite`, and an isolated `CYRUS_HOME` CLI worker against **local D1** (migrations applied via `wrangler d1 migrations apply cyrus --local`).
- Specs can call `cliWorker.restart()` to replace only the CLI worker while preserving the server, authentication, and isolated `CYRUS_HOME`. `cold-resume.spec.ts` uses this to verify a thread resumes with its persisted session after a worker restart.
- The Playwright suite uses process-compose for peer lifecycle:
  1. The worker-scoped `stack` fixture starts sync server + Controller web via `tests/e2e/process-compose.yaml` (D1 migrations applied by the `prepare-database` process).
  2. The worker-scoped `auth` fixture creates a unique account and drives the real device-authorization page (`/auth/device`) via compiled `cyrusd login`, then writes the token into the stack's `CYRUS_HOME`.
  3. The worker-scoped `cliWorker` fixture starts the Worker process through process-compose and exposes `restart()` for mid-scenario Worker-only restarts (cold-resume).
  4. Specs install the fixture's session cookie in the browser and exercise the real Controller UI against the connected Worker.
  5. After the worker's tests finish, process-compose tears down all managed peers and the temporary `CYRUS_HOME` is removed.
- The Worker CLI terminal tier (`tests/e2e/harness/*-terminal.test.ts`) drives the compiled `cyrusd` binary through a shell-use PTY with fixed columns/rows, asserting on rendered output (including ANSI colors) and exit codes. Covered commands: `login`, `start`/`stop`/`status`, and `agents doctor`. Non-interactive commands keep their existing in-process coverage. Nightly CI installs the matching `shell-use` binary via mise (`github:microsoft/shell-use`).
- Local E2E runs do not need an external database URL. Wrangler local D1 is enough. Broader per-run D1 isolation for CI is tracked in #119.
- Playwright server setup ensures the schema exists before starting the signaling server.
- Programmatic session creation for tests uses Better Auth email sign-in (`tests/e2e/harness/auth.ts`); device approval goes through the real `/auth/device` UI (`tests/e2e/web/device-auth.ts`). Email/password auth is enabled when the server runs with `NODE_ENV=testing`.
- Playwright specs and their worker-scoped fixtures live in `tests/e2e/web/`.
- E2E runs manually via `.github/workflows/nightly.yml` (`workflow_dispatch` only).

## Phase 5 notes

- Deploy smoke runs after every server deploy via `tooling/test/smoke/deploy.ts`. Optional `DEPLOY_SMOKE_TOKEN` and `DEPLOY_SMOKE_ROOM_ID` secrets enable a signaling WebSocket check in addition to `GET /health`.
- Nightly also runs build smoke (`build:web`, CLI compile) and real `node-datachannel` checks (`CYRUS_NIGHTLY_WEBRTC=1`).
- `pre-push` now runs `test:unit` locally; integration and E2E stay in CI only.

## OpenSpec coverage map

| OpenSpec | Nearest automated tests |
| --- | --- |
| `conversation-view` | `shared/utils/src/fold.test.ts` |
| `wire-schemas` | `shared/schemas/src/**/*.test.ts` |
| `acp-provider-cli` | `apps/cli/src/core/acp/events.test.ts`, `run-turn.test.ts`; Worker CLI terminal tier `tests/e2e/harness/cli-login-terminal.test.ts`, `cli-service-terminal.test.ts`, `cli-doctor-terminal.test.ts` |
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
- `@cyrus/server` Workers-pool tests exercise the real D1 binding (`env.DB`) under `@cloudflare/vitest-pool-workers`, with Drizzle migrations applied in setup. No Neon or Postgres driver is involved.
