## 1. Wire schemas and contract

- [x] 1.1 Add `ChatOutputSchema` (`{ threadId, turnId }`) to `@cyrus/schemas/rtc/chat`
- [x] 1.2 Add `WatchThreadInputSchema`, `WatchThreadOutputSchema` (`snapshotHighWaterMark`), and `UnwatchThreadInputSchema` to `@cyrus/schemas/rtc/threads`
- [x] 1.3 Change `controllerContract.chat` from `eventIterator(ChatChunkSchema)` to `ChatOutputSchema`
- [x] 1.4 Add `watchThread` and `unwatchThread` to `controllerContract`
- [x] 1.5 Add `watchThread` / `unwatchThread` keys to `shared/constants/src/operation-keys.ts` (if using mutation keys)

## 2. ThreadEventBus (`apps/cli/src/queue`)

- [x] 2.1 Implement `ThreadEventBus` in `apps/cli/src/queue/bus.ts` with watch sets, per-peer queues, and `publish()`
- [x] 2.2 Add `activeTurnLogs: Map<turnId, ChatChunk[]>` with append on publish and eviction on `turn_completed`/`turn_interrupted`
- [x] 2.3 Implement `watch(peerId, threadId)` — register, replay active-turn logs into peer queue (idempotent)
- [x] 2.4 Implement `unwatch(peerId, threadId)` and `ensureWatch(peerId, threadId)` for chat auto-watch
- [x] 2.5 Add per-turn log size cap with delta-first eviction policy (default 10k chunks)
- [x] 2.6 Wire `ThreadEventBus` into `shared/connections/src/rtc/worker/index.ts` and `RtcContext` (`peer.ts`), replacing `createPeerBroadcaster` for chat delivery

## 3. Controller handlers (server)

- [x] 3.1 Refactor `chat` handler to return `{ threadId, turnId }` immediately and run the turn loop without yielding chunks to the RPC caller
- [x] 3.2 Change `emit()` to call `ThreadEventBus.publish()` instead of `broadcaster.broadcast()` (include sender in fan-out)
- [x] 3.3 Auto-watch caller's `threadId` on `chat()` if not already watching
- [x] 3.4 Add `watchThread` and `unwatchThread` handlers
- [x] 3.5 Update `subscribe` handler to consume from `ThreadEventBus.subscribe(peerId)`

## 4. Conversation overlay store (`@cyrus/hooks`)

- [x] 4.1 Create `shared/hooks/src/stores/conversation-overlay.ts` with per-thread overlay state, `applySnapshot`, `applyLiveChunk`, `clearTurn`
- [x] 4.2 Implement `seq`-based dedup rules in `applyLiveChunk`
- [x] 4.3 Implement `waitForTurnEnd(threadId, turnId, signal?)` with resolve on `turn_completed`, reject on `turn_interrupted`
- [x] 4.4 Add `mergeSnapshotAndOverlay(snapshot, overlay)` in `shared/utils` (alongside `fold()`) producing `ConversationEntry[]`

## 5. Shared connection hooks refactor

- [x] 5.1 Update `shared/hooks/src/connection/use-worker-conversation-sync.ts` to write chunks to overlay store only (remove `appendChunkToCache`)
- [x] 5.2 Refactor `shared/hooks/src/connection/use-thread-conversation.ts` to call `watchThread`/`unwatchThread` on mount/unmount, merge snapshot + overlay, then `fold()`
- [x] 5.3 Refactor `shared/hooks/src/connection/use-controller-threads.ts` to call unary `chat()`, then `await waitForTurnEnd(threadId, turnId)`; invalidate threads list on completion
- [x] 5.4 Delete `shared/utils/src/conversation-cache.ts`
- [x] 5.5 Remove dead `if (!thread)` branch from `apps/web/src/components/chat/main/thread-workspace.tsx` `handleSend`

## 6. Verification

- [ ] 6.1 Manual test (web): single device — send message, tokens stream via subscribe, `sendMessage` resolves on `turn_completed`
- [ ] 6.2 Manual test (web): two devices on same thread — both see live stream; device on different thread receives nothing
- [ ] 6.3 Manual test (web): refresh mid-stream — partial tokens replay via `watchThread` active-turn log
- [ ] 6.4 Manual test (web): navigate away and back mid-stream — replay restores in-flight content
- [ ] 6.5 Manual test (web): stop/cancel — `sendMessage` rejects, overlay clears turn
- [x] 6.6 Run `bun check` and `bun check:types` across affected packages
