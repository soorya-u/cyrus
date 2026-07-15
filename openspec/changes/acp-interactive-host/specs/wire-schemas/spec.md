## ADDED Requirements

### Requirement: Respond approval contract

The controller contract SHALL define `respondApproval` with input `{ threadId, toolCallId, optionId }` and void output.

#### Scenario: Contract exported

- **WHEN** `controllerContract` is defined
- **THEN** `respondApproval` uses Zod schemas from `@cyrus/schemas/rtc/chat`

### Requirement: Elicitation wire events and respond contract

The system SHALL define `ElicitationRequestEventSchema` and `RespondElicitationInputSchema` in `@cyrus/schemas/rtc/chat`. The controller contract SHALL define `respondElicitation`.

#### Scenario: Event in union

- **WHEN** chat event types are exported
- **THEN** `elicitation_request` is included in the `AgentEvent` union

#### Scenario: Respond contract exported

- **WHEN** `controllerContract` is defined
- **THEN** `respondElicitation` uses Zod schemas from `@cyrus/schemas/rtc/chat`
