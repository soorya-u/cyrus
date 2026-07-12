## ADDED Requirements

### Requirement: Elicitation wire events

The system SHALL define `ElicitationRequestEventSchema` and `RespondElicitationInputSchema` in `@cyrus/schemas/rtc/chat`.

#### Scenario: Event in union

- **WHEN** chat event types are exported
- **THEN** `elicitation_request` is included in the `AgentEvent` union
