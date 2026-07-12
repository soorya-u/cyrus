## ADDED Requirements

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

Web and mobile clients SHALL render approval requests inline in the thread feed with buttons for each permission option returned by the agent.

#### Scenario: Diff tool approval

- **WHEN** an edit tool call emits an approval request with allow and reject options
- **THEN** the diff UI and feed show accept/reject controls wired to `respondApproval`

#### Scenario: Non-edit tool approval

- **WHEN** a bash or other tool emits an approval request
- **THEN** the feed shows a generic approval card with the same respond path
