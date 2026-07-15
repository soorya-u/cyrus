## ADDED Requirements

### Requirement: Folded approval entries

The conversation fold pipeline SHALL produce view entries for approval requests associated with the correct turn and tool call.

#### Scenario: Approval in feed

- **WHEN** `fold()` processes an `approval_request` event
- **THEN** the result includes a renderable approval entry with tool call reference and options

### Requirement: Folded elicitation entries

The conversation fold pipeline SHALL produce view entries for elicitation requests associated with the correct turn.

#### Scenario: Elicitation in feed

- **WHEN** `fold()` processes an `elicitation_request` event
- **THEN** the result includes a renderable elicitation entry with mode, schema or url, and respond affordances
