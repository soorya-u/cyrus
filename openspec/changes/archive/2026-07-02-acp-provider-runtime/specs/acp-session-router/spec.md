## ADDED Requirements

### Requirement: Thread to session mapping

The worker SHALL maintain an in-memory mapping from Cyrus thread IDs to ACP `sessionId` values per provider.

#### Scenario: New thread creates session

- **WHEN** a prompt arrives for a thread with no existing ACP session
- **THEN** the worker calls ACP `session/new` with the thread's working directory and stores the returned `sessionId`

#### Scenario: Existing thread reuses session

- **WHEN** a prompt arrives for a thread that already has a mapped `sessionId`
- **THEN** the worker calls ACP `session/prompt` on the existing session without creating a new one

### Requirement: Multi-project sessions on one subprocess

The worker SHALL support multiple sessions with different `cwd` values on the same provider subprocess.

#### Scenario: Two threads in different repos

- **WHEN** thread A has `cwd: ~/project-a` and thread B has `cwd: ~/project-b` on the same provider
- **THEN** each thread gets its own ACP session with the respective `cwd` on the shared subprocess

### Requirement: Session recovery after respawn

The worker SHALL attempt to recover sessions after a provider subprocess respawn, preferring `session/resume` over `session/load`.

#### Scenario: Resume supported

- **WHEN** a subprocess respawns and the agent advertised `sessionCapabilities.resume`
- **THEN** the worker calls `session/resume` for each active sessionId without replaying history

#### Scenario: Load fallback

- **WHEN** a subprocess respawns and the agent supports `loadSession` but not `resume`
- **THEN** the worker calls `session/load` for each active sessionId and waits for history replay

### Requirement: ACP event mapping

The worker SHALL map ACP `session/update` notifications to Cyrus `AgentEvent` values for streaming to connected UI peers.

#### Scenario: Agent message streamed

- **WHEN** the ACP agent sends a `session/update` with `agent_message_chunk` content
- **THEN** the worker emits a corresponding `AgentEvent` on the thread's event stream

### Requirement: Session cancellation

The worker SHALL support cancelling an in-flight prompt via ACP `session/cancel`.

#### Scenario: User cancels prompt

- **WHEN** a cancel request arrives for an active thread
- **THEN** the worker sends ACP `session/cancel` for that thread's sessionId
