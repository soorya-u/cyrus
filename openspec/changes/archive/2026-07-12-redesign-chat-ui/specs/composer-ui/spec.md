## ADDED Requirements

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
