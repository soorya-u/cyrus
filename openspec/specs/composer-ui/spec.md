## Purpose

Web chat composer footer controls: combined agent/model picker, compact overflow menu, and primary send/stop action.

## Requirements

### Requirement: Combined agent and model picker

The composer footer SHALL provide a single popover picker that combines agent selection and model selection, matching the t3code `ProviderModelPicker` interaction pattern.

#### Scenario: Trigger shows agent icon and model name

- **WHEN** the composer footer is rendered with a selected agent and model
- **THEN** the picker trigger displays the agent icon from `listAgents` and the selected model name

#### Scenario: Popover switches agent and model together

- **WHEN** the user opens the combined picker and selects a different agent
- **THEN** the model list updates to models from `getModels` for that agent
- **AND** selecting a model updates both agent and model selection

### Requirement: Compact composer controls on narrow viewports

When the composer footer width is below the compact breakpoint (~620px), Effort and Persona controls SHALL move into a compact overflow menu instead of inline selects.

#### Scenario: Wide viewport shows inline controls

- **WHEN** the composer footer is wider than the compact breakpoint
- **THEN** Agent+Model picker, Effort, and Persona are visible inline

#### Scenario: Narrow viewport uses overflow menu

- **WHEN** the composer footer is narrower than the compact breakpoint
- **THEN** Effort and Persona appear in a `⋯` overflow menu
- **AND** the combined Agent+Model picker remains visible

### Requirement: Primary action parity with t3code

The composer send/stop button SHALL match t3code primary action behavior: round send button with arrow icon, destructive round stop button while running, and spinner on send while connecting or sending.

#### Scenario: Stop button while running

- **WHEN** the thread has an active turn or send is in progress
- **THEN** the primary action shows a stop button with destructive styling

#### Scenario: Send spinner while busy

- **WHEN** a message is being sent or the connection is establishing
- **THEN** the send button displays a spinner instead of the arrow icon

### Requirement: Mode selector in composer footer

The composer footer SHALL expose a mode selector when the bound thread session reports available modes.

#### Scenario: Mode visible

- **WHEN** `getModes` returns non-empty options for a bound thread
- **THEN** the composer footer displays a mode dropdown on wide viewports
- **AND** the compact overflow menu includes mode on narrow viewports
- **AND** `setMode` is called on selection

#### Scenario: No modes

- **WHEN** the agent exposes no modes
- **THEN** the mode selector is hidden

### Requirement: Capability-aware composer controls

Clients SHALL cache agent capabilities from `bindAgent` per thread and hide unsupported composer affordances.

#### Scenario: Attachments hidden

- **WHEN** capabilities indicate embedded context is not supported
- **THEN** file and URL attachment controls are not shown

#### Scenario: Slash commands hidden

- **WHEN** the agent exposes no available commands
- **THEN** the composer placeholder omits slash-command guidance

### Requirement: Context consumption display

When the bound session provides token or context usage data, the composer footer SHALL display current consumption near catalog controls.

#### Scenario: Usage visible

- **WHEN** `getContextUsage` returns used and limit values
- **THEN** the composer shows usage text (e.g. tokens used vs limit)

#### Scenario: Usage hidden

- **WHEN** the agent does not report usage
- **THEN** no usage indicator is shown
