# Testing Strategy

Cyrus uses a layered test setup so each part of the system is tested with the runtime closest to production.

## Runners

| Scope | Runner | Location |
| --- | --- | --- |
| `apps/cli`, `apps/desktop` | Bun test | Colocated `*.test.ts` or package `__tests__/integration/` |
| Vitest workspace packages (`apps/web`, `apps/server`, `shared/*`) | Root Vitest Projects | `vitest.config.ts` at the repo root; shared DOM setup in `tooling/test/setup/vitest.shared.ts` |

Vitest is the default runner (ADR 0017). Bun stays permanently for `apps/cli` and `apps/desktop`.

Root `bun test:unit` runs `vitest run --project='@cyrus/*'` (every unit project; `database-integration` sits outside that glob) plus `apps/cli`'s Bun unit suite. Use `vitest run --project <name>` to scope a single project. DOM packages (`apps/web`, `shared/hooks`, `shared/providers`) share Testing Library jest-dom matchers and DOM cleanup via `@cyrus/test/setup/vitest.shared`.

## Layout

```text
<package>/src/**/*.test.ts
<package>/__tests__/integration/
tooling/test/
```

Unit tests stay close to the code they cover. In `apps/server`, every colocated `*.test.ts` runs on the Cloudflare Workers pool via the root Vitest workspace. Integration tests live under the package boundary they exercise. Cross-app tests live at the repo root.

## CI Levels

| Level | Trigger | Tests |
| --- | --- | --- |
| 0 | pre-commit | Ultracite only |
| 1 | pre-push | Typecheck and unit tests |
| 2 | pull request / push to `main` | Lint, typecheck, unit tests, integration |
| 3 | deploy | Health and WebSocket smoke |

`pre-push` runs `test:unit` locally; integration stays in CI only.

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

- `@cyrus/desktop` — thin Bun unit tests for `lib/env` and `lib/auth`.
- `@cyrus/mobile` — Maestro or Detox when the app matures.
- `@cyrus/styles` — out of scope for unit tests.
- Visual regression — deferred.
- End-to-end (Playwright cross-peer flows, Worker CLI terminal tier) — removed; revisit if a future need justifies the process-compose/Playwright/PTY infrastructure cost.

## Phase 3 notes

- ACP prompt mocking lives in `apps/cli/__tests__/helpers/acp-runtime.ts`.
- CLI integration tests use isolated `CYRUS_HOME` directories and subprocess checks.
- Hooks tests currently cover the optimistic conversations cache contract used by `use-controller-threads`.

- `@cyrus/database` integration tests use isolated in-memory Turso databases via `shared/database/__tests__/helpers/turso.ts`.
- `@cyrus/server` Workers-pool tests exercise the real D1 binding (`env.DB`) under `@cloudflare/vitest-pool-workers`, with Drizzle migrations applied in setup. No Neon or Postgres driver is involved.

## Phase 5 notes

- Deploy smoke runs after every server deploy via `tooling/test/smoke/deploy.ts`. Optional `DEPLOY_SMOKE_TOKEN` and `DEPLOY_SMOKE_ROOM_ID` secrets enable a signaling WebSocket check in addition to `GET /health`.
