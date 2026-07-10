## Why

Every connected peer currently receives every chat chunk from every thread, and the web client maintains two parallel ingress paths (`chat()` iterator for the sender, `subscribe()` for everyone else) that both mutate the same query cache. This wastes bandwidth, complicates dedup, and loses in-flight streaming on page refresh because ephemeral token deltas are neither persisted nor replayed. Issue #13 shipped `seq`/cursor primitives; this change consumes them to scope live delivery, unify on a single subscribe stream, and add server-side active-turn replay for mid-stream joins.

## What Changes

- Replace `PeerBroadcaster`'s per-peer blind fan-out with a `ThreadEventBus`: per-peer watched-thread sets, fan-out to all watchers **including the sender**, and a bounded in-memory active-turn log for replay on `watchThread`.
- Add `watchThread` / `unwatchThread` RPCs; client calls them from thread mount/unmount.
- **BREAKING**: Change `chat` from an `eventIterator` to a unary RPC returning `{ threadId, turnId }`. All chunks flow through `subscribe()` only.
- Add a client-side conversation overlay store (Zustand) in `@cyrus/hooks` holding ephemeral/live chunks separate from the `getConversations` TanStack Query snapshot.
- Refactor `useThreadConversation` to merge snapshot + overlay with `seq`-based dedup, then `fold()`.
- `sendMessage` fires `chat()` and awaits turn completion by watching the overlay for `turn_completed` / `turn_interrupted` matching `turnId` (option B).
- Remove `appendChunkToCache` and the `sendMessage` `for await` loop over `chat()`.
- Delete dead `handleSend` `!thread` branch in `thread-workspace.tsx` (sidebar-first model unchanged; `ensureThread` first-message rename stays).

## Capabilities

### New Capabilities

- `thread-live-stream`: Server-side thread-scoped event bus, watch registration, active-turn replay buffer, and scoped fan-out replacing global broadcast.
- `conversation-overlay`: Client-side live overlay store, snapshot/overlay merge, and single subscribe ingress for all live chunks.

### Modified Capabilities

- `wire-schemas`: `chat` output shape changes from `eventIterator(ChatChunk)` to a completion ack; add `watchThread` / `unwatchThread` input/output schemas.
- `conversation-view`: `useThreadConversation` derives view from merged snapshot + overlay instead of a single mutated query cache.

## Impact

- `apps/cli/src/queue/bus.ts` — custom `ThreadEventBus` (watch sets, active-turn logs, scoped fan-out).
- `shared/connections/src/rtc/broadcaster.ts` — superseded for chat delivery once wired; may remain for other uses or be removed during integration.
- `shared/connections/src/rtc/worker/index.ts` — instantiate `ThreadEventBus` instead of `createPeerBroadcaster`.
- `apps/cli/src/handlers/controller/chat.ts` — `chat` becomes command; `emit` publishes to bus.
- `shared/connections/src/contracts/controller.ts` — breaking `chat` contract; new watch RPCs.
- `shared/hooks/src/connection/{use-controller-threads,use-worker-conversation-sync,use-thread-conversation}.ts` — unified subscribe + overlay; consume RTC via `useRtc()`.
- `shared/hooks/src/stores/conversation-overlay.ts` — new overlay store (alongside `agent-catalog`).
- `shared/utils/src/conversation-cache.ts` — removed.
- `shared/constants/src/operation-keys.ts` — optional `watchThread` / `unwatchThread` mutation keys.
- Closes GitHub issue #15.

## Non-goals

- No backward compatibility for the old `chat` eventIterator shape or dual client ingress paths.
- No persistence of per-token deltas to Turso (coalesced message persistence from #13 stays).
- No cross-device Turso sync or remote replication.
- No adoption of `@tanstack/ai` as a dependency.
- No chat-first thread creation; sidebar-first `createThread` flow is unchanged.
