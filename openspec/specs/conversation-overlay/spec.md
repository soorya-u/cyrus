## Purpose

Ephemeral client-side live conversation state layered on top of the durable `getConversations` snapshot.

## Requirements

### Requirement: Conversation overlay store

The client (`@cyrus/hooks`) SHALL maintain a `conversation-overlay` store (Zustand) in `shared/hooks/src/stores/conversation-overlay.ts` holding per-thread live chunks separate from the TanStack Query `getConversations` snapshot. The overlay SHALL track `snapshotHighWaterMark` and `activeTurnIds` per thread.

#### Scenario: Live chunk is stored in overlay

- **WHEN** a `ChatChunk` arrives on `subscribe()` for `threadId` T
- **THEN** the chunk is appended to the overlay for T
- **AND** the `getConversations` query cache is not mutated

#### Scenario: Snapshot seeds watermark

- **WHEN** `getConversations` returns entries for thread T
- **THEN** `snapshotHighWaterMark` for T is set to the maximum `seq` among returned entries
- **AND** overlay entries with `seq > 0` and `seq <= snapshotHighWaterMark` are pruned

### Requirement: Single subscribe ingress

All live `ChatChunk`s on the client SHALL be written exclusively by `useWorkerConversationSync` (`shared/hooks/src/connection/`) into the overlay store. No other code path SHALL append live chunks to the query cache.

#### Scenario: sendMessage does not consume chat iterator

- **WHEN** `sendMessage` is called
- **THEN** it invokes `chat()` as a unary RPC
- **AND** it does not iterate an event stream from `chat()`

### Requirement: Seq-based dedup in overlay

The overlay SHALL reject duplicate or stale chunks using `seq`:

- Chunks with `seq > 0` and `seq <= snapshotHighWaterMark` SHALL be dropped.
- Chunks with `seq > 0` already present in the overlay SHALL be dropped.
- Chunks with `seq === 0` SHALL be accepted while their `turnId` is active.

#### Scenario: Snapshot overlap dedup

- **WHEN** a persisted chunk with `seq` 42 arrives on `subscribe()`
- **AND** `snapshotHighWaterMark` is already 42 or higher
- **THEN** the chunk is not added to the overlay

#### Scenario: Ephemeral delta accepted during active turn

- **WHEN** a `token` delta with `seq === 0` arrives for an active `turnId`
- **THEN** the chunk is added to the overlay

### Requirement: Turn completion reconciles overlay with snapshot

When the overlay receives `turn_completed` or `turn_interrupted` for a `turnId`, it SHALL remove that turn from `activeTurnIds`, invalidate the `getConversations` query for the thread, and prune overlay entries once the refetched snapshot updates the watermark.

#### Scenario: Turn completion triggers snapshot refresh

- **WHEN** `turn_completed` is received for `turnId` T on thread X
- **THEN** `getConversations(X)` is invalidated
- **AND** after refetch, overlay ephemeral entries for T are pruned against the new watermark

### Requirement: sendMessage awaits turn end via overlay (option B)

`sendMessage` (`shared/hooks/src/connection/use-controller-threads.ts`) SHALL register a `waitForTurnEnd(threadId, turnId)` promise before calling `chat()`. It SHALL resolve when the overlay receives `turn_completed` for that `turnId`, or reject on `turn_interrupted` or abort.

#### Scenario: sendMessage completes on turn_completed

- **WHEN** `sendMessage` calls `chat()` and receives `{ turnId }`
- **AND** the overlay subsequently receives `turn_completed` for that `turnId`
- **THEN** `sendMessage` resolves successfully

#### Scenario: sendMessage rejects on turn_interrupted

- **WHEN** the overlay receives `turn_interrupted` for the awaited `turnId`
- **THEN** `sendMessage` rejects with an error

### Requirement: watchThread on thread mount

`useThreadConversation` (or a hook it composes) SHALL call `watchThread` when a thread workspace mounts and `unwatchThread` on unmount, before or in parallel with the `getConversations` fetch.

#### Scenario: Mount registers watch

- **WHEN** `ThreadWorkspace` mounts for `threadId` T
- **THEN** `watchThread({ threadId: T })` is called
- **AND** `unwatchThread({ threadId: T })` is called on unmount
