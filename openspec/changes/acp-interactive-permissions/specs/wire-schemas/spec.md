## ADDED Requirements

### Requirement: Respond approval contract

The controller contract SHALL define `respondApproval` with input `{ threadId, toolCallId, optionId }` and void output.

#### Scenario: Contract exported

- **WHEN** `controllerContract` is defined
- **THEN** `respondApproval` uses Zod schemas from `@cyrus/schemas/rtc/chat`
