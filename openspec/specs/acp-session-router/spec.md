# ACP Session Router

## Purpose

Map Cyrus threads to ACP sessions on shared agent subprocesses, route prompts, stream events, and recover committed sessions after respawn.

## Requirements

### Requirement: Thread to session mapping

The worker SHALL maintain a mapping from Cyrus thread IDs to ACP `sessionId` values per agent in memory. Draft (unlocked) sessions SHALL remain memory-only until the first user message persists them to the local `threads` table. Sessions SHALL be created at agent bind time, not on first prompt.

#### Scenario: Bind creates draft session in memory

- **WHEN** `bindAgent` succeeds for a draft thread
- **THEN** the worker stores the returned `sessionId` in the in-memory map
- **AND** does not write `agentName` or `sessionId` to Turso

#### Scenario: First prompt persists and reuses bound session

- **WHEN** a prompt arrives for a thread with a live in-memory session and no persisted `sessionId`
- **THEN** the worker persists `agentName` and `sessionId` to Turso before prompting
- **AND** calls ACP `session/prompt` on that session without creating a new one

#### Scenario: Prompt without bind fails

- **WHEN** a prompt arrives for a thread with no in-memory session and no committed persisted `sessionId`
- **THEN** the worker rejects the prompt with an error indicating the agent must be bound first

### Requirement: Multi-project sessions on one subprocess

The worker SHALL support multiple sessions with different `cwd` values on the same agent subprocess.

#### Scenario: Two threads in different repos

- **WHEN** thread A has `cwd: ~/project-a` and thread B has `cwd: ~/project-b` on the same agent
- **THEN** each thread gets its own ACP session with the respective `cwd` on the shared subprocess

### Requirement: Session recovery after respawn

The worker SHALL attempt to recover **committed** sessions (`agentLocked` true) after an agent subprocess respawn or worker restart, preferring `session/resume` over `session/load`, using the persisted `sessionId` and project `cwd` from the thread row. Draft sessions SHALL NOT be resumed from Turso; the client SHALL call `bindAgent` again to mint a fresh session.

#### Scenario: Resume on worker restart for committed thread

- **WHEN** the worker restarts and a prompt or catalog operation needs a locked thread with persisted `sessionId`
- **THEN** the worker re-attaches via `session/resume` when the agent advertised resume capability

#### Scenario: Draft thread after worker restart

- **WHEN** the worker restarts and a draft thread has no live session
- **THEN** catalog and chat require a new `bindAgent` (no resume of a disposable draft id)

#### Scenario: Load fallback

- **WHEN** a subprocess respawns and the agent supports `loadSession` but not `resume`
- **THEN** the worker calls `session/load` for the persisted `sessionId` of a locked thread and waits for history replay
- **AND** Turso conversation entries remain the client transcript source of truth

### Requirement: ACP event mapping

The worker SHALL map ACP `session/update` notifications to Cyrus `AgentEvent` values for streaming to connected UI peers, including a discrete completion event carrying the full accumulated text for a finished message.

#### Scenario: Agent message streamed

- **WHEN** the ACP agent sends a `session/update` with `agent_message_chunk` content
- **THEN** the worker emits a corresponding `AgentEvent` on the thread's event stream

#### Scenario: Agent message completed

- **WHEN** the normalized ACP runtime reports a message as complete (`message.completed`/`reasoning.completed`), carrying the full accumulated text
- **THEN** the worker emits a discrete "message completed" `AgentEvent` containing that full text, distinct from the preceding per-fragment delta events

### Requirement: Session cancellation

The worker SHALL support cancelling an in-flight prompt via ACP `session/cancel`.

#### Scenario: User cancels prompt

- **WHEN** a cancel request arrives for an active thread
- **THEN** the worker sends ACP `session/cancel` for that thread's sessionId
