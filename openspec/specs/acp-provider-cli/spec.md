# ACP Provider CLI

## Purpose

CLI commands for managing enabled ACP registry agents. Users browse the ACP registry, enable agents by registry id, and verify connectivity via doctor.

## Requirements

### Requirement: Agent list command

The CLI SHALL provide `cyrusd agents list` that displays all enabled agents from `agents.yml` with registry id, display name, and icon URL.

#### Scenario: List all agents

- **WHEN** user runs `cyrusd agents list`
- **THEN** the CLI prints each enabled agent's registry id, name, and icon URL

### Requirement: Agent add command

The CLI SHALL provide `cyrusd agents add <registry-id...>` to enable one or more agents from the ACP registry.

#### Scenario: Add agent

- **WHEN** user runs `cyrusd agents add claude-acp`
- **THEN** the agent metadata is persisted to `~/.cyrus/agents.yml`

#### Scenario: Add multiple agents

- **WHEN** user runs `cyrusd agents add claude-acp codex-acp`
- **THEN** the CLI enables each registry id in order and reports per-id success or failure

#### Scenario: Warn on missing runtime deps

- **WHEN** user runs `cyrusd agents add` for an npx-distributed agent and `npx` is not on PATH
- **THEN** the CLI adds the agent and prints a warning that runtime dependencies are missing

#### Scenario: Fail on unsupported platform

- **WHEN** user runs `cyrusd agents add` for a binary-only agent with no build for the current platform
- **THEN** the CLI fails with an error and does not write to `agents.yml`

### Requirement: Agent remove command

The CLI SHALL provide `cyrusd agents rm <registry-id...>` to disable one or more enabled agents.

#### Scenario: Remove agent

- **WHEN** user runs `cyrusd agents rm claude-acp`
- **THEN** the agent is removed from `~/.cyrus/agents.yml`

#### Scenario: Remove multiple agents

- **WHEN** user runs `cyrusd agents rm claude-acp codex-acp`
- **THEN** the CLI disables each registry id in order and reports per-id success or failure

### Requirement: Agent doctor command

The CLI SHALL provide `cyrusd agents doctor [--name <registry-id>]` to verify enabled agents by spawning the resolved command and completing an ACP `initialize` handshake.

#### Scenario: Doctor all agents

- **WHEN** user runs `cyrusd agents doctor` with no name
- **THEN** the CLI checks every enabled agent sequentially and reports healthy/unhealthy status

#### Scenario: Doctor specific agent

- **WHEN** user runs `cyrusd agents doctor --name claude-acp`
- **THEN** the CLI checks only that agent and reports the result

#### Scenario: Long-running checks show progress

- **WHEN** doctor checks an agent whose first spawn may download packages or binaries
- **THEN** the CLI shows a spinner while the check is in progress

### Requirement: No install commands

The CLI SHALL NOT provide commands that install or manage ACP agent packages directly. Spawn-time resolution is handled by native registry resolution (npx/uvx/binary).

#### Scenario: No install subcommand

- **WHEN** user runs `cyrusd agents install claude-acp`
- **THEN** the CLI reports that the command does not exist

#### Scenario: Doctor reports spawn failures

- **WHEN** `cyrusd agents doctor` finds an agent cannot spawn or initialize
- **THEN** the CLI prints a descriptive error but does not install packages itself

### Requirement: Worker capability advertisement

The worker SHALL advertise enabled agents from `agents.yml` in `listAgents` only when the agent passes a health check (spawn + ACP `initialize` succeeds). The response SHALL include `id`, `name`, and `icon` for each healthy agent.

#### Scenario: Unhealthy agent omitted

- **WHEN** the worker serves `listAgents` and an enabled agent fails doctor/initialize
- **THEN** that agent is omitted from the response

#### Scenario: Healthy agents advertised

- **WHEN** the worker serves `listAgents` and `agents.yml` contains healthy `claude-acp` and unhealthy `codex-acp`
- **THEN** the response includes only `claude-acp` with its display metadata

#### Scenario: Health check cached

- **WHEN** `listAgents` is called multiple times within the configured health cache TTL
- **THEN** the worker reuses recent health results without re-spawning each agent on every request
