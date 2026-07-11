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
