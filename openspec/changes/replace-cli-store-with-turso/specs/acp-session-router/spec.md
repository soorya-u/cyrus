## MODIFIED Requirements

### Requirement: ACP event mapping

The worker SHALL map ACP `session/update` notifications to Cyrus `AgentEvent` values for streaming to connected UI peers, including a discrete completion event carrying the full accumulated text for a finished message.

#### Scenario: Agent message streamed

- **WHEN** the ACP agent sends a `session/update` with `agent_message_chunk` content
- **THEN** the worker emits a corresponding `AgentEvent` on the thread's event stream

#### Scenario: Agent message completed

- **WHEN** the normalized ACP runtime reports a message as complete (`message.completed`/`reasoning.completed`), carrying the full accumulated text
- **THEN** the worker emits a discrete "message completed" `AgentEvent` containing that full text, distinct from the preceding per-fragment delta events
