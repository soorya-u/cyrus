## ADDED Requirements

### Requirement: Bind agent wire contract

The controller contract SHALL define `bindAgent` accepting `threadId`, `projectId`, and `agentName`, returning catalog snapshot and bound session metadata.

#### Scenario: Bind output includes catalog

- **WHEN** a client calls `bindAgent`
- **THEN** the response includes models, modes, efforts, personas, and agent capabilities sufficient to populate the composer footer

### Requirement: Thread-scoped catalog inputs

Catalog controller operations (`getModels`, `getModes`, `getEfforts`, `getPersonas`, `setModel`, `setMode`, `setEffort`, `setPersona`) SHALL require `threadId` in their input schemas.

#### Scenario: getModels requires threadId

- **WHEN** `GetModelsInputSchema` is defined
- **THEN** it includes `threadId` as a required field

### Requirement: Thread schema wire fields

`ThreadSchema` SHALL include optional `sessionId` and `agentLocked` fields.

#### Scenario: Thread wire shape

- **WHEN** a consumer imports `ThreadSchema`
- **THEN** `sessionId` and `agentLocked` are optional fields on the thread object
