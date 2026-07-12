## ADDED Requirements

### Requirement: Persisted thread error events

The worker SHALL emit and persist conversation events when ACP bind, resume, prompt, or subprocess operations fail for a thread. Clients SHALL render these errors in the thread feed.

#### Scenario: Bind failure

- **WHEN** `bindAgent` fails due to spawn or initialize error
- **THEN** the worker returns an error to the client
- **AND** if a partial thread state exists, an error event is persisted on the thread when applicable

#### Scenario: Prompt failure mid-turn

- **WHEN** a chat turn fails due to agent crash or ACP error
- **THEN** the worker persists a `thread_error` event (or normalized session error event) for that turn
- **AND** emits `turn_interrupted`

#### Scenario: Resume failure on worker restart

- **WHEN** session resume fails for a persisted `sessionId`
- **THEN** the worker persists an error event on the thread
- **AND** subsequent prompt attempts return a descriptive error until re-bind

### Requirement: Inline error display

The web and mobile clients SHALL display thread error events as inline feed entries with a human-readable message and optional retry guidance (e.g. re-select agent).

#### Scenario: Error visible in feed

- **WHEN** a persisted error event exists for a thread
- **THEN** `fold()` produces a view entry rendered in the conversation feed
- **AND** the composer shows a disabled or warning state when the thread cannot accept input

### Requirement: No client health dashboard

The clients SHALL NOT display per-agent connection health indicators. Unhealthy agents SHALL be excluded server-side from `listAgents`.

#### Scenario: Missing agent in dropdown

- **WHEN** an enabled agent fails health check
- **THEN** it does not appear in the agent selector
- **AND** no separate health UI is shown
