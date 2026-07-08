## ADDED Requirements

### Requirement: Durable project and thread storage

The CLI worker SHALL persist `Project` and `Thread` records to a local Turso database instead of in-memory storage, so they survive process restarts.

#### Scenario: Restart preserves projects and threads

- **WHEN** the CLI worker process restarts
- **THEN** previously created projects and threads are still retrievable via `listProjects`/`listThreads`

### Requirement: Durable conversation entry storage

The CLI worker SHALL persist each `ConversationEntry` for a thread to the Turso database, so conversation history survives process restarts and does not rely on the ACP agent's own session state.

#### Scenario: Restart preserves conversation history

- **WHEN** the CLI worker process restarts after a thread has received messages
- **THEN** `getConversations` for that thread returns the same entries as before the restart

#### Scenario: ACP session/load does not substitute for persistence

- **WHEN** an ACP agent subprocess respawns and the worker recovers the session via `session/load`
- **THEN** the worker does not rely on ACP to replay conversation content to the client — the persisted entries in Turso remain the source of truth for the client-facing transcript

### Requirement: Local database location

The Turso database file SHALL live under the CLI's `CYRUS_HOME` directory, consistent with other per-device local state such as `agents.yml`.

#### Scenario: Default location

- **WHEN** `CYRUS_HOME` is not overridden
- **THEN** the Turso database file is created under `~/.cyrus`

### Requirement: Monotonic conversation sequence

Each persisted `ConversationEntry` SHALL be assigned a monotonically increasing `seq` value at write time, and `seq` SHALL be included on the `ConversationEntry` and its corresponding `ChatChunk`.

#### Scenario: Sequence increases across entries

- **WHEN** two conversation entries are persisted in succession, for the same or different threads
- **THEN** the second entry's `seq` is strictly greater than the first's

### Requirement: Cursor-based conversation reads

The `getConversations` operation SHALL accept an optional `afterSeq` parameter and, when provided, SHALL return only entries for the thread with `seq` strictly greater than `afterSeq`.

#### Scenario: Fetch without cursor

- **WHEN** `getConversations` is called for a thread with no `afterSeq`
- **THEN** all persisted entries for that thread are returned, ordered by `seq`

#### Scenario: Fetch with cursor

- **WHEN** `getConversations` is called for a thread with `afterSeq` set to a previously observed `seq`
- **THEN** only entries with a strictly greater `seq` are returned

### Requirement: Persist-before-broadcast ordering

The worker SHALL persist a conversation entry and obtain its assigned `seq` before broadcasting the corresponding `ChatChunk` to connected peers.

#### Scenario: Broadcast carries a durable sequence

- **WHEN** an event is emitted during a chat turn
- **THEN** the entry is written to Turso first, and the `ChatChunk` broadcast to peers includes the `seq` returned by that write

### Requirement: Coalesced message persistence

The worker SHALL buffer streamed text and thought deltas for a message in memory, keyed by `messageId`, and SHALL persist exactly one `ConversationEntry` containing the full accumulated text when the message completes — not one entry per raw delta. Tool call, tool call update, and plan events SHALL continue to be persisted immediately as their own entries.

#### Scenario: Streamed message persists once

- **WHEN** an agent message is streamed as multiple text deltas followed by a completion event
- **THEN** exactly one `ConversationEntry` is persisted for that message, containing the fully accumulated text
- **AND** each individual delta is still broadcast live to connected peers as it arrives

#### Scenario: Tool call persists immediately

- **WHEN** a tool call event or tool call update event is emitted
- **THEN** it is persisted as its own `ConversationEntry` without buffering
