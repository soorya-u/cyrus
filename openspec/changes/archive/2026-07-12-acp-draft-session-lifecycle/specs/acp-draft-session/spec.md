## ADDED Requirements

### Requirement: Bind agent creates draft session

The worker SHALL provide a `bindAgent` controller operation that, for a given `threadId`, `projectId`, and `agentName`, ensures the agent subprocess is initialized, calls ACP `session/new` with the project's working directory, persists the returned `sessionId`, and returns a catalog snapshot (models, modes, efforts, personas, capabilities).

#### Scenario: First bind on draft thread

- **WHEN** `bindAgent` is called for a thread with no `sessionId` and a valid project
- **THEN** the worker creates an ACP session with `cwd` equal to the project path
- **AND** persists `agentName` and `sessionId` on the thread row
- **AND** returns catalog options from that session

#### Scenario: Re-bind same agent is idempotent

- **WHEN** `bindAgent` is called for a thread already bound to the same `agentName` with a valid in-memory or persisted session
- **THEN** the worker reuses the existing session without calling `session/new` again
- **AND** returns the current catalog snapshot

### Requirement: Agent switch on draft thread

The worker SHALL allow changing `agentName` on a draft thread (no conversation entries and `agentLocked` false) by closing the previous ACP session and creating a new session for the newly selected agent.

#### Scenario: Switch agent before first message

- **WHEN** `bindAgent` is called with a different `agentName` on an unlocked draft thread
- **THEN** the worker calls `closeSession` on the previous `sessionId` if present
- **AND** creates a new session for the new agent
- **AND** updates persisted `agentName` and `sessionId`

#### Scenario: Switch agent blocked after first turn

- **WHEN** `bindAgent` is called with a different `agentName` on a thread where `agentLocked` is true
- **THEN** the worker rejects the request with an error indicating the agent is locked

### Requirement: Agent lock after first turn

The worker SHALL set `agentLocked` to true when the first conversation entry (user message) is persisted for a thread.

#### Scenario: Lock on first message

- **WHEN** the first `user_message` conversation entry is persisted for a thread
- **THEN** `agentLocked` is set to true on the thread row
- **AND** subsequent `bindAgent` calls with a different agent are rejected

### Requirement: Close session on thread delete

The worker SHALL call ACP `closeSession` for a thread's persisted `sessionId` when the thread is deleted, before removing the thread row.

#### Scenario: Delete bound thread

- **WHEN** `deleteThread` is called for a thread with a non-null `sessionId`
- **THEN** the worker attempts `closeSession` on that session
- **AND** deletes the thread and its conversation entries from Turso

#### Scenario: Delete unbound thread

- **WHEN** `deleteThread` is called for a thread with no `sessionId`
- **THEN** the worker deletes the thread row without ACP calls

### Requirement: Thread-scoped catalog reads

Catalog operations (`getModels`, `getModes`, `getEfforts`, `getPersonas`) SHALL require a `threadId` and SHALL read catalog data from that thread's bound ACP session. The worker SHALL NOT use a shared probe session in a unrelated working directory.

#### Scenario: Catalog requires a bound session

- **WHEN** `getModels` is called for a thread with no bound session
- **THEN** the worker returns an error instructing the client to call `bindAgent` first

#### Scenario: Catalog uses project cwd session

- **WHEN** `getModels` is called for a bound thread
- **THEN** catalog options reflect the session created with the project's working directory
