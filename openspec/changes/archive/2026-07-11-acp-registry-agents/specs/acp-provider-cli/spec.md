## MODIFIED Requirements

### Requirement: Agent list command

The CLI SHALL provide `cyrusd agents list` that displays all enabled agents from `agents.yml` with registry id, display name, and icon URL.

#### Scenario: List all agents

- **WHEN** user runs `cyrusd agents list`
- **THEN** the CLI prints each enabled agent's registry id, name, and icon URL

### Requirement: Agent add command

The CLI SHALL provide `cyrusd agents add <registry-id>` to enable an agent from the ACP registry.

#### Scenario: Add agent

- **WHEN** user runs `cyrusd agents add claude-acp`
- **THEN** the agent metadata is persisted to `~/.cyrus/agents.yml`

#### Scenario: Warn on missing runtime deps

- **WHEN** user runs `cyrusd agents add` for an npx-distributed agent and `npx` is not on PATH
- **THEN** the CLI adds the agent and prints a warning that runtime dependencies are missing

#### Scenario: Fail on unsupported platform

- **WHEN** user runs `cyrusd agents add` for a binary-only agent with no build for the current platform
- **THEN** the CLI fails with an error and does not write to `agents.yml`

### Requirement: Agent doctor command

The CLI SHALL provide `cyrusd agents doctor [registry-id]` to verify enabled agents via acpr spawn and ACP `initialize` handshake.

#### Scenario: Doctor all agents

- **WHEN** user runs `cyrusd agents doctor` with no name
- **THEN** the CLI checks every enabled agent and reports healthy/unhealthy status

#### Scenario: Doctor specific agent

- **WHEN** user runs `cyrusd agents doctor claude-acp`
- **THEN** the CLI checks only that agent via acpr and reports the result

### Requirement: Worker capability advertisement

The worker SHALL advertise all enabled agents from `agents.yml` in `listAgents`, including `id`, `name`, and `icon`.

#### Scenario: All enabled agents advertised

- **WHEN** the worker serves `listAgents` and `agents.yml` contains `claude-acp` and `codex-acp`
- **THEN** the response includes both agents with their display metadata regardless of PATH or spawn health

## MODIFIED Requirements

### Requirement: No install commands

The CLI SHALL NOT provide commands that install or manage ACP agent packages directly. Spawn-time resolution is delegated to acpr.

#### Scenario: No install subcommand

- **WHEN** user runs `cyrusd agents install claude-acp`
- **THEN** the CLI reports that the command does not exist

#### Scenario: Doctor reports spawn failures

- **WHEN** `cyrusd agents doctor` finds an agent cannot spawn via acpr
- **THEN** the CLI prints acpr stderr or a descriptive error but does not install packages itself

## REMOVED Requirements

### Requirement: Agent update command

**Reason**: Registry metadata is authoritative; agents are added/removed by registry id only. No manual command/args overrides.

**Migration**: Remove agent with `cyrusd agents rm <id>` and re-add after `cyrusd agents registry sync` if metadata changed.
