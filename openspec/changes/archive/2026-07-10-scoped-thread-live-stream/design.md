## Context

`PeerBroadcaster` (`shared/connections/src/rtc/broadcaster.ts`) pushes every `ChatChunk` to every connected peer except the sender (`id !== fromPeerId`). The client compensates with two ingress paths: `sendMessage` (`shared/hooks/src/connection/use-controller-threads.ts`) consumes `chat()`'s event iterator directly, while `useWorkerConversationSync` consumes `subscribe()`. Both write into the same `getConversations` query cache via `appendChunkToCache` (`shared/utils/src/conversation-cache.ts`).

PR #22 (`connection-providers`) moved connection hooks to `@cyrus/hooks`, query keys to `@cyrus/constants`, and RTC bootstrapping to `RtcProvider` + `useRtc()`. This change builds on that layout — overlay and hook refactors target `shared/hooks`, not `apps/web` directly.

Issue #13 (merged, PR #18) added Turso persistence, monotonic `seq` on persisted entries, `getConversations(afterSeq)`, and coalesced message persistence (token deltas are ephemeral, `seq: 0`). The server-side `messageBuffers` in `chat.ts` exist only for coalescing within a single `chat()` generator — they are not replayable.

Mid-stream page refresh loses all in-flight token deltas: Turso has only persisted events, `PeerBroadcaster` queues are per-peer and ephemeral, and the client overlay (today: mutated query cache) is gone on reload.

## Goals / Non-Goals

**Goals:**

- Single client ingress: all live chunks flow through `subscribe()` → overlay store.
- Single server egress path: `emit()` publishes to a thread-scoped event bus; `chat()` is a command, not a chunk stream.
- Scope delivery to peers watching the relevant thread, not all connected peers.
- Replay in-flight turn chunks to late joiners (refresh, navigate-away-and-back, second device opening same thread) via a bounded server-side active-turn log.
- Client merge of durable snapshot (`getConversations`) + live overlay with `seq`-based dedup.
- `sendMessage` completion via overlay observation of `turn_completed` / `turn_interrupted` for the returned `turnId` (option B).

**Non-Goals:**

- Backward compatibility for `chat` as `eventIterator` or dual client ingress.
- Persisting per-token deltas to Turso.
- Adopting `@tanstack/ai`.
- Chat-first thread creation (sidebar-first unchanged; `ensureThread` first-message rename stays).

## Decisions

### Replace `PeerBroadcaster` with `ThreadEventBus`

**Choice:** Custom `ThreadEventBus` in `apps/cli/src/queue/bus.ts` owns watch sets, per-peer delivery queues, and active-turn logs. No third-party event bus library — the API is domain-specific (thread watch sets, per-peer `AsyncGenerator`, active-turn replay).

**Why over patching `PeerBroadcaster`:** Watch filtering and turn replay are thread-scoped concerns, not peer-queue concerns. A clean type keeps `subscribe(peerId)` as the per-peer stream API while moving fan-out logic to `publish(chunk)`.

**Structure:**

```text
ThreadEventBus
├── watchers: Map<peerId, Set<threadId>>
├── peers: Map<peerId, { queue, resolve, closed }>   // subscribe delivery
├── activeTurnLogs: Map<turnId, ChatChunk[]>         // replay buffer
└── publish(chunk):
      1. if turn not terminal → append to activeTurnLogs[turnId]
      2. on turn_completed/turn_interrupted → evict activeTurnLogs[turnId] after publish
      3. for each peer where chunk.threadId ∈ watchers[peerId] → enqueue (INCLUDING sender)
```

**Alternative considered:** Per-thread Kafka / durable log. Rejected — bounded in-memory retention until `turn_completed` is sufficient; Turso already holds durable events.

### `chat()` becomes a unary command

**Choice:** `chat` RPC returns `{ threadId, turnId }` immediately after starting the turn. The handler runs the agent loop in the background (or continues the existing async generator internally without yielding chunks to the RPC caller).

**Why:** Eliminates the sender exclusion hack. All peers, including the initiator, receive chunks through `subscribe()`. Matches TanStack AI's `send` + `subscribe` pattern.

**ORPC shape:**

```typescript
chat: oc.input(ChatInputSchema).output(ChatOutputSchema),
// ChatOutputSchema = { threadId: string, turnId: string }

watchThread: oc.input(WatchThreadInputSchema).output(WatchThreadOutputSchema),
unwatchThread: oc.input(UnwatchThreadInputSchema).output(VoidOutputSchema),
```

### `watchThread` replays active-turn log before live fan-out

**Choice:** `watchThread(peerId, threadId)` registers the watch set entry, synchronously replays `activeTurnLogs` for all in-progress turns on that thread into the peer's queue, and returns `{ snapshotHighWaterMark: number }` (max persisted `seq` for the thread, queried from Turso).

**Join sequence on client:**

1. `watchThread(threadId)` — register + replay + cursor
2. `getConversations(threadId)` — snapshot → `overlay.applySnapshot()`
3. Live chunks via `subscribe()` → `overlay.applyLiveChunk()`

Overlap between replay and snapshot is expected; client dedup by `seq` resolves it (t3-code pattern from issue #15 comment).

**Alternative considered:** `getConversations` first, then `watchThread`. Rejected as primary order — replay from active-turn log is required for ephemeral deltas regardless of snapshot timing.

### Client overlay store (Zustand)

**Choice:** `shared/hooks/src/stores/conversation-overlay.ts` holds per-thread live chunks and `snapshotHighWaterMark`. Single writer: `useWorkerConversationSync` in `shared/hooks/src/connection/`. Hooks consume RTC via `useRtc()` from `@cyrus/hooks/contexts/rtc` (provided by `RtcProvider`).

**Dedup rules:**

- `seq > 0` and `seq <= snapshotHighWaterMark` → drop (already in snapshot)
- `seq > 0` and duplicate in overlay → drop
- `seq === 0` (ephemeral delta) → accept while turn is active

**On `turn_completed` / `turn_interrupted`:** remove turn from `activeTurnIds`, invalidate `getConversations`, on refetch call `applySnapshot()` which bumps watermark and prunes overlay entries with `seq <= watermark`.

### `sendMessage` completion via overlay (option B)

**Choice:** After `await client.chat({...})` returns `{ turnId }`, `sendMessage` awaits a promise that resolves when the overlay receives `turn_completed` or `turn_interrupted` for that `turnId` on that `threadId`. Rejects on `turn_interrupted` or timeout.

**Why over unary `chat` blocking until turn done:** Keeps `chat` RPC fast to acknowledge; UI already updates via subscribe. Avoids long-held RPC connections. Completion is observable on the same stream the UI uses.

**Implementation:** `waitForTurnEnd(threadId, turnId, signal?)` exported from overlay store, backed by a `Map<turnId, { resolve, reject }>` registered before calling `chat()`.

### Remove `appendChunkToCache`

**Choice:** Delete `shared/utils/src/conversation-cache.ts`. `getConversations` query cache is snapshot-only; overlay is the sole live layer.

### Auto-watch on `chat()` for sender

**Choice:** When `chat()` starts a turn, the server auto-registers `threadId` in the caller's watch set if not already present. Client still calls `watchThread` on `ThreadWorkspace` mount for the general case (navigate to existing thread, second device). Auto-watch prevents a race where the sender calls `chat()` before `watchThread` returns.

### Keep `subscribe()` as one stream per peer

**Choice:** No per-thread subscribe streams. Filtering happens inside `publish()`. Preserves the existing "one active subscription per peer" constraint (`close(peerId)` on re-subscribe).

## Risks / Trade-offs

- **[Risk]** Active-turn log grows if a turn never completes (agent hang). → **Mitigation:** Cap log size per turn (e.g. 10k chunks); on cap, evict oldest deltas but keep terminal events. `cancel` still emits `turn_interrupted`.
- **[Risk]** `sendMessage` waits forever if subscribe disconnects mid-turn. → **Mitigation:** `waitForTurnEnd` respects `AbortSignal` from stop/cancel; timeout fallback invalidates snapshot and clears overlay turn.
- **[Risk]** Duplicate chunks on join from replay + snapshot overlap. → **Mitigation:** `seq`-based dedup in overlay; snapshot wins on `seq` collision.
- **[Risk]** Background `chat()` handler errors invisible to client if subscribe is down. → **Mitigation:** `turn_interrupted` still publishes to bus; if subscribe reconnects, replay may be empty but snapshot has persisted state. Log server-side errors.
- **[Risk]** Breaking `chat` eventIterator affects any non-web consumer. → **Mitigation:** Explicit non-goal; workspace is versioned together, no external clients.

## Migration Plan

No data migration. Deploy server and web together (no backward compatibility).

1. Ship `ThreadEventBus` + watch RPCs + `chat` command shape on CLI worker.
2. Ship overlay store + refactored hooks in `@cyrus/hooks`.
3. Remove `appendChunkToCache` and `shared/utils/src/conversation-cache.ts`.
4. Manual test matrix: web (primary), verify mobile inherits shared hooks behavior where RTC is mounted.

Rollback: revert both server and web; old dual-path client is incompatible with new server `chat` shape.

## Open Questions

- Exact per-turn log cap (10k chunks vs byte-size limit) — **decided: 10k default, delta-first eviction** (`apps/cli/src/queue/bus.ts`).
- Should `waitForTurnEnd` timeout be configurable or a fixed constant (e.g. 30 min)?
- Mobile (`apps/mobile`) — inherits shared `@cyrus/hooks` overlay once RTC is mounted; no separate overlay implementation needed.
