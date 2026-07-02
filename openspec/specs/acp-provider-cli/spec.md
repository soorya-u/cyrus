# ACP Provider CLI

## Purpose

CLI commands for managing registered ACP agents. Users install agents outside Cyrus; the CLI registers spawn recipes and verifies connectivity.

## Requirements

### Requirement: Agent list command

The CLI SHALL provide `cyrusd agents list` that displays all registered agents and their configured command and args.

#### Scenario: List all agents

- **WHEN** user runs `cyrusd agents list`
- **THEN** the CLI prints each agent's name, command, and args

### Requirement: Agent add command

The CLI SHALL provide `cyrusd agents add <name> --cmd <command> [--args ...]` to register a new agent.

#### Scenario: Add agent

- **WHEN** user runs `cyrusd agents add claude-code --cmd claude-code-acp`
- **THEN** the agent is persisted to `~/.cyrus/agents.yml`

### Requirement: Agent remove command

The CLI SHALL provide `cyrusd agents rm <name>` to remove a registered agent.

#### Scenario: Remove agent

- **WHEN** user runs `cyrusd agents rm claude-code`
- **THEN** the agent is removed from `~/.cyrus/agents.yml`

### Requirement: Agent update command

The CLI SHALL provide `cyrusd agents update <name> [--cmd <command>] [--args ...]` to update a registered agent.

#### Scenario: Update agent args

- **WHEN** user runs `cyrusd agents update gemini --args --experimental-acp`
- **THEN** the agent's args are updated in `agents.yml`

### Requirement: Agent doctor command

The CLI SHALL provide `cyrusd agents doctor [name]` to verify agent commands and ACP connectivity.

#### Scenario: Doctor all agents

- **WHEN** user runs `cyrusd agents doctor` with no name
- **THEN** the CLI checks every registered agent's PATH availability and ACP `initialize` handshake

#### Scenario: Doctor specific agent

- **WHEN** user runs `cyrusd agents doctor claude-code`
- **THEN** the CLI checks only that agent and reports worker status

### Requirement: No install commands

The CLI SHALL NOT provide any command that installs, downloads, or manages agent packages. Users MUST install agents outside the Cyrus ecosystem (npm, brew, manual download).

#### Scenario: No install subcommand

- **WHEN** user runs `cyrusd agents install claude-code`
- **THEN** the CLI reports that the command does not exist

#### Scenario: Doctor hints at external install

- **WHEN** `cyrusd agents doctor` finds an agent command not on PATH
- **THEN** the CLI prints an external install hint but does not perform installation

### Requirement: Worker capability advertisement

The worker SHALL advertise only available registered agents in `WorkerCapabilities.agents` when joining the signaling room.

#### Scenario: Only available agents advertised

- **WHEN** the worker starts and `claude-code` is available but `codex` is not
- **THEN** `WorkerCapabilities.agents` includes `claude-code` and excludes `codex`
