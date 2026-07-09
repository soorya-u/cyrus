## 1. Create @cyrus/providers package

- [x] 1.1 Create `shared/providers/package.json`, `tsconfig.json`, and add to workspace
- [x] 1.2 Implement `createQueryClient({ onError })` and `QueryProvider` in `shared/providers/src/query/`
- [x] 1.3 Implement `SignalingProvider` with TanStack Query bootstrap, loading/error gating, session cleanup, and exported context object
- [x] 1.4 Implement `OrpcProvider` depending on signaling context, keyed by `workerId`, with connection cleanup
- [x] 1.5 Add shared types (`SignalingDialer`, `OrpcDialer`, `OrpcSignaling`, `OrpcController`) in `shared/providers/src/types.ts`

## 2. Internal context hooks in @cyrus/hooks

- [x] 2.1 Add `@cyrus/providers`, `@tanstack/react-query`, `@orpc/tanstack-query`, `@cyrus/connections` dependencies to `shared/hooks/package.json`
- [x] 2.2 Create `shared/hooks/src/contexts/` with internal `useSignaling`, `useOrpcSignaling`, `useWorkerConnection`, `useOrpcController` (not exported from package)
- [x] 2.3 Create `shared/hooks/src/connection/query-keys.ts` moving `SIGNALING_OPERATION_KEYS` and `RTC_OPERATION_KEYS` from web

## 3. Move connection data hooks to @cyrus/hooks

- [x] 3.1 Move `useProjects` and `useThreads` to `shared/hooks/src/connection/`
- [x] 3.2 Move `useAgentCatalog`, `useThreadConversation`, `useListDir` to shared package
- [x] 3.3 Move `useControllerThreads`, `useWorkerConversationSync`, and peer-list logic (`useWorkers`) to shared package
- [x] 3.4 Move `appendChunkToCache` utility alongside connection hooks

## 4. Web integration

- [x] 4.1 Replace `apps/web/src/utils/query-client.ts` with `createQueryClient` from `@cyrus/providers`; adopt `QueryProvider`
- [x] 4.2 Remove `queryClient` from TanStack Router context in `main.tsx`; simplify `__root.tsx` to `createRootRoute`
- [x] 4.3 Refactor `apps/web/src/lib/orpc.ts` to export dial functions matching shared dialer types
- [x] 4.4 Replace `beforeLoad` in `/_workspace/route.tsx` with `SignalingProvider` in layout
- [x] 4.5 Replace `beforeLoad` in `/$workerId/route.tsx` with `OrpcProvider`; remove manual connection close effect
- [x] 4.6 Update web hook/component imports; remove `orpcController` guard from `WorkersSidebar`
- [x] 4.7 Delete web copies of migrated hooks and RTC/signaling operation keys from `constants/operation-keys.ts`

## 5. Mobile integration

- [x] 5.1 Replace `apps/mobile/utils/query-client.ts` with `createQueryClient` from `@cyrus/providers`; adopt `QueryProvider`
- [x] 5.2 Delete `apps/mobile/contexts/app-theme-context.tsx`; remove from `_layout.tsx`; use Expo color themes
- [x] 5.3 Create `apps/mobile/lib/orpc.ts` with native dial functions
- [x] 5.4 Wire `SignalingProvider` in mobile workspace layout; add `@cyrus/providers` and `@cyrus/hooks` dependencies

## 6. Verification

- [x] 6.1 Run `bun check:types` and `bun check` across affected packages
- [x] 6.2 Manually verify web: workspace loads, worker select connects, projects/threads work
- [x] 6.3 Manually verify web: simulate connection failure and confirm error UI + retry works
