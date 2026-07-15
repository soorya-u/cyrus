## Requirements

### Requirement: Blocking permission host

The worker SHALL NOT auto-allow ACP `requestPermission` calls. The host SHALL emit an approval event, block the tool call until the user responds or the turn is cancelled, and return the selected permission decision to the agent.

#### Scenario: Permission blocks turn

- **WHEN** an agent requests permission during a prompt turn
- **THEN** the worker emits an `approval_request` event
- **AND** the turn does not proceed until `respondApproval` is received or the turn is cancelled

#### Scenario: Cancel resolves pending as deny

- **WHEN** the user cancels a turn with a pending approval
- **THEN** the worker resolves the pending permission with deny
- **AND** emits `turn_interrupted`

### Requirement: Approval event persistence

Approval request events SHALL be persisted as conversation entries so observers joining mid-turn see pending approvals.

#### Scenario: Observer sees pending approval

- **WHEN** a client subscribes to a thread with a pending approval
- **THEN** `getConversations` includes the `approval_request` entry

### Requirement: Respond approval RPC

The controller SHALL provide `respondApproval` accepting `threadId`, `toolCallId`, and `optionId`, resolving the matching pending permission on the owning worker.

#### Scenario: Allow once

- **WHEN** the client calls `respondApproval` with an allow_once option id
- **THEN** the worker resolves the permission with allow once
- **AND** the agent continues the tool call

#### Scenario: Deny

- **WHEN** the client calls `respondApproval` with a reject option id
- **THEN** the worker resolves the permission with deny
- **AND** the agent receives the rejection outcome

### Requirement: Approval UI

Web clients SHALL present pending approval requests in the chat composer (prompt textarea replaced), with up to three stacked option buttons (allow once / always / reject), truncated when labels overflow.

#### Scenario: Diff tool approval

- **WHEN** an edit tool call emits an approval request with allow and reject options
- **THEN** the composer shows stacked accept/reject controls wired to `respondApproval`

#### Scenario: Non-edit tool approval

- **WHEN** a bash or other tool emits an approval request
- **THEN** the composer shows the same stacked respond path

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

Clients SHALL render elicitation requests in the chat composer with form fields or url confirmation and stacked respond actions.

#### Scenario: Form rendered

- **WHEN** an `elicitation_request` with form schema is pending
- **THEN** the composer renders inputs matching the schema fields

### Requirement: Capability gating

Elicitation UI SHALL only be enabled when the bound agent capabilities indicate elicitation support.

#### Scenario: Unsupported agent

- **WHEN** the agent does not support elicitation
- **THEN** no elicitation UI chrome is shown

### Requirement: Shared pending cleanup

Canceling a turn SHALL clear all pending permissions and elicitations for that thread.

#### Scenario: Cancel clears elicitation

- **WHEN** the user cancels a turn with a pending elicitation
- **THEN** the worker completes the elicitation with decline
- **AND** emits `turn_interrupted`
