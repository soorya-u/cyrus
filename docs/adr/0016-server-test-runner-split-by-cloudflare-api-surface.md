# `apps/server` test runner splits by Cloudflare API surface, not by package

_Decided 2026-07-19. Superseded by [0017](./0017-vitest-default-bun-only-cli-desktop.md)._

The repo's default test-runner rule is "pure logic on `bun:test`, Vitest only where DOM or workerd behavior is required" (see `docs/guides/TESTING_FRAMEWORK.md`). Applied literally to `apps/server`, that would put everything except the `Hub` Durable Object class (`apps/server/src/cloudflare/partyserver.ts`, bound in `wrangler.json`) on `bun:test`. We're drawing the line differently within this one package: any file that touches a Cloudflare-specific API — the `Hub` class itself, WebSocket/hibernation handling, the `fetch` handler — runs under `@cloudflare/vitest-pool-workers`; a file stays on `bun:test` only if it has zero Cloudflare API surface.

The reason is fidelity, not convenience: code that looks "pure" in isolation still executes inside workerd's V8 isolate in production, and Bun's runtime shims (even with `nodejs_compat`) aren't guaranteed to agree with workerd on `Request`/`Response` semantics, the WebSocket API, or other edge cases. Testing such code under Bun tests a different runtime than the one it actually runs in.

We rejected two alternatives. Keeping the literal repo-wide default (only the DO class on the Workers pool) under-covers code that runs in workerd merely because it doesn't look stateful. Moving the entire package onto the Workers pool regardless of API surface was rejected on cost: workerd cold-starts are slower per test file than Bun's native runner, `pre-push` runs `test:unit` locally for every contributor, and paying that cost for code with no Cloudflare API surface buys no fidelity gain.

Consequence: `apps/server`'s runner choice is decided per file, by whether it touches a Cloudflare API — not by a single package-wide rule the way `apps/web` or `shared/hooks` get one.
