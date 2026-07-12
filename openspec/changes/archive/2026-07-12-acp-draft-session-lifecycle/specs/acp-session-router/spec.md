## MODIFIED Requirements

### Requirement: Thread to session mapping

The worker SHALL maintain a mapping from Cyrus thread IDs to ACP `sessionId` values per agent, persisted in the local `threads` table and hydrated into memory on use. Sessions SHALL be created at agent bind time, not on first prompt.

#### Scenario: Bind creates session

- **WHEN** `bindAgent` succeeds for a draft thread
- **THEN** the worker stores the returned `sessionId` in Turso and in the in-memory map

#### Scenario: First prompt reuses bound session

- **WHEN** a prompt arrives for a thread with a persisted `sessionId`
- **THEN** the worker calls ACP `session/prompt` on that session without creating a new one

#### Scenario: Prompt without bind fails

- **WHEN** a prompt arrives for a thread with no persisted `sessionId`
- **THEN** the worker rejects the prompt with an error indicating the agent must be bound first

### Requirement: Session recovery after respawn

The worker SHALL attempt to recover sessions after an agent subprocess respawn or worker restart, preferring `session/resume` over `session/load`, using the persisted `sessionId` and project `cwd` from the thread row.

#### Scenario: Resume on worker restart

- **WHEN** the worker restarts and a prompt or catalog operation needs a thread with persisted `sessionId`
- **THEN** the worker re-attaches via `session/resume` when the agent advertised resume capability

#### Scenario: Load fallback

- **WHEN** a subprocess respawns and the agent supports `loadSession` but not `resume`
- **THEN** the worker calls `session/load` for the persisted `sessionId` and waits for history replay
- **AND** Turso conversation entries remain the client transcript source of truth
