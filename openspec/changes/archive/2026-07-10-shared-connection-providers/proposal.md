## Why

Web currently bootstraps RTC connections through TanStack Router `beforeLoad` and injects `signaling`, `orpcSignaling`, `workerConnection`, and `orpcController` into route context. Consumption hooks use `useRouteContext({ strict: false })` with optional chaining because shared UI renders both inside and outside worker-scoped routes. This is not type-safe, duplicates connection lifecycle concerns in the router, and cannot be reused by mobile (Expo Router has no `beforeLoad`). Both signaling and worker connections need a cross-platform pattern with explicit loading, error, and retry behavior.

`queryClient` is also wired into TanStack Router context but is never read from route context — all consumers use `useQueryClient()` from `QueryClientProvider` instead.

## What Changes

- Add a new **`@cyrus/providers`** package in `shared/providers/` exporting shared providers only (where apps mount them is app-specific):
  - **`QueryProvider`** + **`createQueryClient({ onError })`** — unifies the near-identical web (`toast` on error) and mobile (`evlog` on error) query-client setup behind a single `onError` callback.
  - **`SignalingProvider`** (workspace scope) — TanStack Query bootstrap for signaling session + `orpcSignaling`.
  - **`OrpcProvider`** (worker scope) — TanStack Query bootstrap for controller RTC connection + `orpcController`; depends on `SignalingProvider`.
- Add internal context consumption hooks in **`@cyrus/hooks/src/contexts/`** (`useSignaling`, `useOrpcSignaling`, `useWorkerConnection`, `useOrpcController`) — used by shared data hooks only, **not exported** from the package.
- Move connection-dependent data hooks (`useProjects`, `useThreads`, `useAgentCatalog`, etc.) to `@cyrus/hooks`, consuming internal context hooks instead of TanStack Router context.
- Remove `beforeLoad` connection dialing from `/_workspace` and `/_workspace/workers/$workerId`; route layouts mount providers instead.
- Remove `queryClient` from TanStack Router context (`main.tsx`, `__root.tsx`); router is routing-only.
- Add connection error UI with retry (`refetch`) at each provider level via injectable `errorFallback` props.
- Wire mobile workspace layout to the same providers; delete `apps/mobile/contexts/app-theme-context.tsx` in favor of [Expo color themes](https://docs.expo.dev/develop/user-interface/color-themes/).
- **BREAKING**: Remove `signaling`, `orpcSignaling`, `workerConnection`, `orpcController`, and `queryClient` from TanStack Router route context.

## Capabilities

### New Capabilities

- `connection-providers`: Cross-platform React providers (`@cyrus/providers`) for query client, signaling, and worker RTC connections, with type-safe internal consumption in `@cyrus/hooks`, lifecycle cleanup, and error/retry UX.

### Modified Capabilities

(none)

## Impact

- **Affected code**: `apps/web/src/main.tsx`, `apps/web/src/routes/__root.tsx`, `apps/web/src/routes/_workspace/route.tsx`, `apps/web/src/routes/_workspace/workers/$workerId/route.tsx`, `apps/web/src/lib/orpc.ts`, `apps/web/src/utils/query-client.ts`, all hooks using `useRouteContext` for connections (~8 files), `apps/mobile/app/_layout.tsx`, `apps/mobile/utils/query-client.ts`, `apps/mobile/contexts/app-theme-context.tsx` (deleted).
- **New shared code**: `shared/providers/` (`QueryProvider`, `SignalingProvider`, `OrpcProvider`); `shared/hooks/src/contexts/` (internal); `shared/hooks/src/connection/` (data hooks, query keys).
- **Dependencies**: new `@cyrus/providers` package; `@cyrus/hooks` gains `@cyrus/providers`, `@tanstack/react-query`, `@orpc/tanstack-query`, `@cyrus/connections`.
- **Systems**: No server changes. Connection behavior is client-side only.

## Non-goals

- Replacing TanStack Router for routing, auth redirects, or URL structure on web.
- Changing RTC protocols, oRPC contracts, or server signaling handlers.
- Exporting internal context hooks from `@cyrus/hooks` — apps consume data hooks or mount providers, not `useOrpcController()` directly.
- Building full mobile worker UI — mobile only gets provider wiring scaffolding if layouts do not yet exist.
