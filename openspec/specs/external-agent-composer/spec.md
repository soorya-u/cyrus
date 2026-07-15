## Purpose

External-agent composer behavior beyond the base footer controls: capability-gated attachments, slash commands, prompt queueing, and structured prompt content mapped to ACP.

## Requirements

### Requirement: Mode selector in composer

The web and mobile composer SHALL expose a mode selector when the bound thread session reports available modes.

#### Scenario: Mode visible

- **WHEN** `getModes` returns non-empty options for a bound thread
- **THEN** the composer footer displays a mode dropdown
- **AND** `setMode` is called on selection

#### Scenario: No modes

- **WHEN** the agent exposes no modes
- **THEN** the mode selector is hidden

### Requirement: Capability-aware composer

Clients SHALL cache agent capabilities from `bindAgent` per thread and hide or disable composer features the agent does not support.

#### Scenario: Image attach hidden

- **WHEN** capabilities indicate images are not supported
- **THEN** image attachment controls are not shown

#### Scenario: Attachments shown when supported

- **WHEN** capabilities indicate embedded context is supported
- **THEN** file and URL attachment controls are available

### Requirement: Context consumption display

When the bound session provides token or context usage data, the composer SHALL display current consumption near catalog controls.

#### Scenario: Usage visible

- **WHEN** the worker reports context usage for a thread
- **THEN** the composer shows usage text (e.g. tokens used vs limit)

#### Scenario: Usage hidden

- **WHEN** the agent does not report usage
- **THEN** no usage indicator is shown

### Requirement: Slash command autocomplete

The worker SHALL forward session `availableCommands` updates to clients. Clients SHALL offer autocomplete when the user types `/` in the composer.

#### Scenario: Commands populated after bind

- **WHEN** the agent pushes available commands for the session
- **THEN** the client updates slash autocomplete options

#### Scenario: Select slash command

- **WHEN** the user selects a slash command from autocomplete
- **THEN** the composer inserts the command text

### Requirement: Prompt queue

Clients SHALL queue outbound messages while a turn is active and send them sequentially when the turn completes, unless the user removes or edits queued items first.

#### Scenario: Message queued during generation

- **WHEN** the user sends a message while a turn is active
- **THEN** the message is added to a per-thread queue
- **AND** is not sent until the current turn completes

#### Scenario: Queue drains

- **WHEN** a turn completes and the queue is non-empty
- **THEN** the next queued message is sent automatically

### Requirement: File and URL attachments

The chat RPC SHALL accept structured prompt content including file path references and URLs. The worker SHALL map these to ACP prompt content blocks.

#### Scenario: File attachment

- **WHEN** the user attaches a project file via @ picker
- **THEN** the prompt includes a resource block with the file path relative to project cwd

#### Scenario: URL attachment

- **WHEN** the user attaches a URL
- **THEN** the prompt includes a resource block with the URL uri

### Requirement: Available commands in bind output

`bindAgent` or a thread-scoped catalog refresh SHALL include the current `availableCommands` list when the agent provides it.

#### Scenario: Initial commands

- **WHEN** `bindAgent` completes and the session returns available commands
- **THEN** the bind response or immediate catalog update includes the command list
