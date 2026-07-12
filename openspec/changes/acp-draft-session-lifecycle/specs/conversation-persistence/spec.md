## ADDED Requirements

### Requirement: Thread session persistence

The `threads` table SHALL store optional `sessionId` (ACP session id) and `agentLocked` (boolean) columns alongside existing `agentName`.

#### Scenario: Draft thread defaults

- **WHEN** a new thread is created
- **THEN** `agentName`, `sessionId` are null and `agentLocked` is false

#### Scenario: Bind persists session fields

- **WHEN** `bindAgent` succeeds
- **THEN** `agentName` and `sessionId` are persisted on the thread row

#### Scenario: Agent name persisted before first message

- **WHEN** the user selects an agent and `bindAgent` completes
- **THEN** `agentName` is available in `listThreads` without waiting for the first chat message

### Requirement: Thread schema wire sync

`ThreadSchema` SHALL expose optional `sessionId` and `agentLocked` fields consistent with the database columns.

#### Scenario: Thread list includes bind state

- **WHEN** `listThreads` returns a bound draft thread
- **THEN** each thread includes `agentName`, `sessionId`, and `agentLocked` when set
