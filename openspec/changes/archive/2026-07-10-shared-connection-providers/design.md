## Context

Today, web bootstraps RTC in TanStack Router `beforeLoad`:

```
/_workspace                    beforeLoad → dialSignaling()
  └── /workers/$workerId      beforeLoad → dialController(signaling, workerId)
```

Eight hooks read `orpcController` / `workerConnection` via `useRouteContext({ strict: false })` with optional chaining. `useWorker` reads `orpcSignaling` / `signaling` via `useRouteContext({ from: "/_workspace" })` — stricter, but still router-coupled.

Separately, `queryClient` is passed into TanStack Router context (`main.tsx` → `createRouter({ context: { queryClient } })`) but **nothing reads it from route context** — all hooks use `useQueryClient()` from `QueryClientProvider`. This is dead scaffolding.

Web and mobile each define nearly identical `QueryClient` setup with different `onError` handlers (`toast` vs `evlog`).

Mobile (Expo Router) has no `beforeLoad`. `@cyrus/connections` already provides platform dial primitives. The gap is a shared React layer for lifecycle, type-safe consumption, and error/retry UX.

Signaling and worker connection are two distinct scopes with a dependency edge: worker dial requires an active signaling session. Both deserve the same provider pattern.

## Goals / Non-Goals

**Goals:**

- One cross-platform pattern for signaling and worker connection bootstrap (web + mobile).
- Separate **`@cyrus/providers`** package for providers only; **`@cyrus/hooks`** for data hooks with internal context consumption.
- Unified `createQueryClient({ onError })` replacing duplicated web/mobile query-client files.
- Complete type safety inside provider boundaries via internal context hooks.
- Failed connections surface error UI with manual retry; children do not mount until connection succeeds.
- Remove `queryClient` from TanStack Router context.
- Delete mobile `AppThemeProvider` in favor of Expo's built-in color theme support.

**Non-goals:**

- Removing TanStack Router from web.
- Exporting internal context hooks from `@cyrus/hooks`.
- Full mobile feature parity in this change.

## Decisions

### Package split: `@cyrus/providers` vs `@cyrus/hooks`

```
shared/providers/          → exported providers only
  query/                   → createQueryClient, QueryProvider
  signaling/               → SignalingProvider (+ context object for hooks)
  orpc/                    → OrpcProvider (+ context object for hooks)

shared/hooks/
  contexts/                → internal useSignaling, useOrpcController, etc. (NOT exported)
  connection/              → useProjects, useThreads, etc. (exported)
```

`@cyrus/providers` exports **providers only**. Apps decide where to mount them (web route layouts, mobile drawer layout). `@cyrus/hooks` depends on `@cyrus/providers` for context objects and implements internal consumption hooks in `src/contexts/` that are **not** part of the package's public exports.

### Unified QueryProvider with onError callback

Replace duplicated `apps/web/src/utils/query-client.ts` and `apps/mobile/utils/query-client.ts`:

```ts
// @cyrus/providers/query/create-query-client.ts
export function createQueryClient({ onError }: { onError?: QueryOnError }) {
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
  });
}

// @cyrus/providers/query/query-provider.tsx
export function QueryProvider({ client, children }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

Apps create the client with platform-specific error handling:

```ts
// web
const queryClient = createQueryClient({
  onError: (error, query) => toast.error(..., { action: { onClick: () => query.invalidate() } }),
});

// mobile
const queryClient = createQueryClient({
  onError: (error) => log.error({ kind: "query_error", error }),
});
```

Remove `queryClient` from `createRouter({ context })` and simplify `__root.tsx` to `createRootRoute` (no router context needed for query client).

### Two-tier provider stack, both Query-backed

```
QueryProvider
  └── SignalingProvider          (workspace scope)
        └── OrpcProvider         (workerId scope)
              └── app children
```

**SignalingProvider** — `useQuery({ queryKey: ['signaling', userId], queryFn: dialSignaling })`. On success provides `SignalingSession` + `orpcSignaling` via context.

**OrpcProvider** — reads signaling from parent context. `useQuery({ queryKey: ['controller', workerId], queryFn: () => dialOrpc(signaling, workerId) })`. On success provides `ControllerConnection` + `orpcController` via context.

Both gate children: pending → loading fallback, error → `errorFallback({ error, retry })`, success → context + children.

Platform dial functions injected as props from `apps/web/lib/orpc.ts` or `apps/mobile/lib/orpc.ts`.

### Internal context hooks in `@cyrus/hooks/src/contexts/`

```ts
// hooks/src/contexts/orpc.ts — NOT exported from package.json
import { OrpcConnectionContext } from "@cyrus/providers/orpc/orpc-context";

export function useOrpcController(): OrpcController {
  const ctx = useContext(OrpcConnectionContext);
  if (!ctx) throw new Error("useOrpcController requires OrpcProvider");
  return ctx.orpc;
}
```

Same for `useSignaling()`, `useOrpcSignaling()`, `useWorkerConnection()`. Data hooks in `hooks/src/connection/` call these internally. Apps never import context hooks directly.

### Query configuration for connections

```ts
{
  staleTime: Infinity,
  gcTime: 0,
  retry: 2,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
}
```

Cleanup on unmount / `workerId` change via `useEffect(() => () => connection.close())`.

### Web route changes

Remove all `beforeLoad` connection dialing. Mount providers in layouts:

```tsx
// _workspace/route.tsx
<SignalingProvider dialSignaling={dialSignaling} ...>
  <Outlet />
</SignalingProvider>

// $workerId/route.tsx
<OrpcProvider workerId={workerId} dialOrpc={dialOrpc} ...>
  <Outlet />
</OrpcProvider>
```

Remove connection fields from route context. Remove manual `workerConnection.close()` effect (provider owns cleanup).

### Mobile changes

- Replace inline `QueryClientProvider` + local `query-client.ts` with `@cyrus/providers` `createQueryClient` + `QueryProvider`.
- Mount `SignalingProvider` at workspace layout.
- Delete `apps/mobile/contexts/app-theme-context.tsx`; rely on Expo color themes (`userInterfaceStyle` in app config, `useColorScheme` where needed).

### Error UI

Providers accept `errorFallback?: (props: { error: Error; retry: () => void }) => ReactNode`. Apps supply platform-appropriate UI (web: styled button + message; mobile: RN `Pressable`). No shared cross-platform error component required in `@cyrus/providers`.

## Risks / Trade-offs

- **[Brief loading flash on navigation]** Query-based bootstrap renders layout once in pending state. → Acceptable; `useSuspenseQuery` optional later.
- **[Strict mode double-mount]** → Query dedupes by key; `close()` must be idempotent.
- **[Signaling reconnect]** No auto-reconnect on socket drop. → Future change.
- **[Internal context hooks]** Apps cannot call `useOrpcController()` directly. → By design; use exported data hooks or mount under provider tree.
- **[Breaking route context]** Mechanical migration via grep.

## Migration Plan

1. Create `shared/providers/` package (`createQueryClient`, `QueryProvider`, `SignalingProvider`, `OrpcProvider`).
2. Add `shared/hooks/src/contexts/` internal hooks; move connection data hooks to `shared/hooks/src/connection/`.
3. Web: adopt `@cyrus/providers` query client; remove router `queryClient` context; wire signaling/orpc providers in route layouts; migrate hook imports.
4. Mobile: adopt `@cyrus/providers` query client; wire `SignalingProvider`; delete `app-theme-context.tsx`.
5. `bun check:types` + `bun check`; manual test web worker flow and connection error/retry.

Rollback: revert commit; no data migration.

## Open Questions

- Should `useSuspenseQuery` be used on web from the start? **Recommendation: explicit fallbacks first.**
- Should signaling query key include user id? **Recommendation: yes** — `['signaling', userId]`.
