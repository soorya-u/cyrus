# ACP Provider Config

## Purpose

Define how the Cyrus worker discovers and loads agent spawn configuration. Users install agents outside Cyrus; the worker reads registered agent definitions to know how to spawn and communicate over ACP stdio.

## Requirements

### Requirement: Agent registry file

The CLI SHALL persist registered agents at `~/.cyrus/agents.yml`, each entry specifying `command` and `args`.

#### Scenario: Empty registry

- **WHEN** no `~/.cyrus/agents.yml` exists
- **THEN** the agent registry is empty until the user registers agents

#### Scenario: Registered agent loaded

- **WHEN** `agents.yml` contains a valid agent entry
- **THEN** the CLI loads the entry with `command` and `args` for spawn and doctor checks

### Requirement: Agent config schema validation

The CLI SHALL validate agent configuration against a Zod schema and reject invalid configs with a descriptive error.

#### Scenario: Invalid registry entry

- **WHEN** `agents.yml` contains an entry missing required `command` field
- **THEN** the CLI skips or rejects the invalid entry with a validation error on write

### Requirement: User-managed registry via CLI

Users SHALL register agents with `cyrusd agents add <name> --cmd <command> [--args ...]`. The worker SHALL NOT install agent packages.

#### Scenario: Add agent

- **WHEN** user runs `cyrusd agents add claude-code --cmd claude-code-acp`
- **THEN** the agent is stored in `agents.yml` with the given command and args

#### Scenario: Remove agent

- **WHEN** user runs `cyrusd agents rm claude-code`
- **THEN** the agent is removed from `agents.yml`

### Requirement: Environment variable interpolation

The worker SHALL support `${env:VAR_NAME}` syntax in agent `env` values at spawn time when env configuration is added.

#### Scenario: API key from environment

- **WHEN** an agent env entry is `ANTHROPIC_API_KEY: ${env:ANTHROPIC_API_KEY}`
- **THEN** the spawned subprocess receives the value of `ANTHROPIC_API_KEY` from the worker's environment
