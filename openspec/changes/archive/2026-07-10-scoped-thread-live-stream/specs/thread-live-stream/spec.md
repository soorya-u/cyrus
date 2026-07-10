## ADDED Requirements

### Requirement: Thread-scoped event bus replaces global broadcast

The worker SHALL route live `ChatChunk` delivery through a `ThreadEventBus` implemented in `apps/cli/src/queue/bus.ts` that fans out only to peers whose watched-thread set includes `chunk.threadId`. The bus SHALL deliver chunks to the initiating peer as well as all other watching peers.

#### Scenario: Non-watching peer receives nothing

- **WHEN** peer B is connected but has not called `watchThread` for thread A
- **AND** a chat turn is active on thread A
- **THEN** peer B's `subscribe()` stream does not receive chunks for thread A

#### Scenario: Watching peer receives live chunks

- **WHEN** peer C has called `watchThread` for thread A
- **AND** a chat turn emits chunks on thread A
- **THEN** peer C's `subscribe()` stream receives those chunks in emission order

#### Scenario: Initiating peer receives its own chunks via subscribe

- **WHEN** peer A calls `chat()` for thread A
- **THEN** peer A receives all chunks for that turn through `subscribe()`, not through the `chat()` RPC response

### Requirement: Active-turn replay buffer

The `ThreadEventBus` in `apps/cli/src/queue/bus.ts` SHALL maintain an in-memory `activeTurnLogs` buffer per in-progress `turnId` containing all `ChatChunk`s emitted during that turn, including ephemeral deltas with `seq === 0`. The buffer SHALL be evicted when `turn_completed` or `turn_interrupted` is published for that `turnId`.

#### Scenario: Late watcher receives in-flight deltas

- **WHEN** a turn is in progress on thread A with partial token deltas already emitted
- **AND** a peer calls `watchThread` for thread A before the turn completes
- **THEN** the peer receives a replay of all buffered chunks for active turns on thread A before subsequent live chunks

#### Scenario: Completed turn log is evicted

- **WHEN** `turn_completed` is published for `turnId` T
- **THEN** `activeTurnLogs` for T is removed
- **AND** a subsequent `watchThread` does not replay chunks from turn T (durable history comes from `getConversations`)

### Requirement: watchThread and unwatchThread RPCs

The controller contract SHALL expose `watchThread` and `unwatchThread` operations. `watchThread` SHALL register the calling peer's interest in a thread, replay active-turn logs for that thread, and return a `snapshotHighWaterMark` (the highest persisted `seq` for that thread). `unwatchThread` SHALL remove the registration.

#### Scenario: watchThread returns cursor

- **WHEN** a peer calls `watchThread({ threadId })`
- **THEN** the peer is registered as watching `threadId`
- **AND** the response includes `snapshotHighWaterMark` equal to the max persisted `seq` for that thread (or 0 if none)

#### Scenario: unwatchThread stops delivery

- **WHEN** a peer calls `unwatchThread({ threadId })`
- **THEN** subsequent chunks for `threadId` are not delivered to that peer's `subscribe()` stream

### Requirement: chat is a turn-start command

The `chat` RPC SHALL accept `ChatInput` and return `{ threadId, turnId }` without streaming `ChatChunk`s. The worker SHALL run the agent turn asynchronously, publishing all chunks via `ThreadEventBus.publish()`.

#### Scenario: chat returns turn identity

- **WHEN** a peer calls `chat({ agentName, message, projectId, threadId })`
- **THEN** the RPC returns `{ threadId, turnId }` before the turn completes
- **AND** all chunks for the turn arrive on `subscribe()`

#### Scenario: chat auto-watches sender thread

- **WHEN** a peer calls `chat()` for `threadId` T
- **AND** the peer is not already watching T
- **THEN** the server registers T in that peer's watched-thread set before publishing the first chunk

### Requirement: emit publishes through the bus

`chat.ts`'s `emit()` function SHALL call `ThreadEventBus.publish(chunk)` for all events. Persisted events SHALL still be written to Turso before publish (persist-before-broadcast from conversation-persistence). Ephemeral deltas (`seq === 0`) SHALL be published without a Turso write.

#### Scenario: Persisted event carries seq on publish

- **WHEN** a non-delta event is emitted
- **THEN** the chunk is persisted to Turso and assigned a `seq > 0` before `publish()`
- **AND** the published chunk includes that `seq`

#### Scenario: Delta is ephemeral

- **WHEN** a `token` or `thought` delta is emitted
- **THEN** the published chunk has `seq === 0`
- **AND** no Turso row is written for that delta
