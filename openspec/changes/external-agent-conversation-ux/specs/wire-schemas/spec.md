## ADDED Requirements

### Requirement: Thread error wire event

The system SHALL define a `thread_error` chat event schema in `@cyrus/schemas/rtc/chat` with a human-readable message and optional error code. The event SHALL be persistable as a `ConversationEntry`.

#### Scenario: Schema exported

- **WHEN** a consumer imports chat event types from `@cyrus/schemas/rtc/chat`
- **THEN** `ThreadErrorEventSchema` is available and included in the `AgentEvent` union
