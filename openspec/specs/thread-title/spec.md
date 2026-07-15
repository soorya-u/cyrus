## Purpose

Thread display names from Turso: auto-title after first turn, optional agent-provided titles, and user rename precedence. Titles are never discovered via ACP `listSessions`.

## Requirements

### Requirement: Auto title after first turn

The worker SHALL update a thread's `name` after the first completed turn when the name is still the default `"New thread"`, using a Cyrus-owned title generator derived from the first user message and/or first assistant response text (sanitized, max 50 characters).

#### Scenario: Default title replaced

- **WHEN** the first `turn_completed` event is persisted for a thread named `"New thread"`
- **THEN** the worker updates `threads.name` to a generated title
- **AND** `listThreads` reflects the new name

#### Scenario: Custom title preserved

- **WHEN** the user renamed the thread before the first turn completed
- **THEN** auto-title does not overwrite the user-set name

#### Scenario: Manual rename wins

- **WHEN** the user calls `renameThread` after an auto title was applied
- **THEN** subsequent auto-title logic does not overwrite the manual name

### Requirement: Agent-provided title updates

When an ACP session notification includes a session title update mapped by the worker, the worker MAY update `threads.name` only if the current name is still default or previously agent-generated (not user-renamed).

#### Scenario: Agent pushes title

- **WHEN** the bound session emits a title update and the thread name is `"New thread"`
- **THEN** the worker updates `threads.name` to the agent-provided title

#### Scenario: User rename blocks agent title

- **WHEN** the user manually renamed the thread
- **THEN** agent-provided title updates are ignored

### Requirement: Not sourced from listSessions

Thread listing and titles SHALL come from Turso `threads` rows. The worker SHALL NOT call ACP `listSessions` for thread discovery.

#### Scenario: Thread list from database

- **WHEN** the client calls `listThreads`
- **THEN** results come from Turso ordered by `updatedAt`
- **AND** no agent session list API is invoked
