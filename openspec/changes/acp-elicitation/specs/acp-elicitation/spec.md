## ADDED Requirements

### Requirement: Elicitation host bridge

The worker ACP host SHALL handle agent elicitation requests by emitting `elicitation_request` events and blocking until `respondElicitation` or turn cancellation.

#### Scenario: Form elicitation

- **WHEN** the agent sends a form-mode elicitation with a JSON schema
- **THEN** the worker emits an `elicitation_request` event containing the schema and message
- **AND** blocks until the user responds

#### Scenario: URL elicitation

- **WHEN** the agent sends a url-mode elicitation
- **THEN** the worker emits an `elicitation_request` with the url
- **AND** blocks until the user confirms or declines

### Requirement: Respond elicitation RPC

The controller SHALL provide `respondElicitation` accepting `threadId`, `elicitationId`, action, and optional form content.

#### Scenario: Accept form

- **WHEN** the client submits valid form content via `respondElicitation`
- **THEN** the worker completes the elicitation with accept action
- **AND** the agent continues

#### Scenario: Decline

- **WHEN** the client declines an elicitation
- **THEN** the worker completes with decline action

### Requirement: Elicitation UI

Clients SHALL render elicitation requests as inline cards with form fields or url confirmation.

#### Scenario: Form rendered

- **WHEN** an elicitation_request with form schema is in the feed
- **THEN** the UI renders inputs matching the schema fields

### Requirement: Capability gating

Elicitation UI SHALL only be enabled when the bound agent capabilities indicate elicitation support.

#### Scenario: Unsupported agent

- **WHEN** the agent does not support elicitation
- **THEN** no elicitation UI chrome is shown
