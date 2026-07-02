## ADDED Requirements

### Requirement: Agent list command

The CLI SHALL provide `cyrusd agents list` that displays all configured agents and their commands.

#### Scenario: List all agents

- **WHEN** user runs `cyrusd agents list`
- **THEN** the CLI prints each agent's name, command, and args

### Requirement: Agent detect command

The CLI SHALL provide `cyrusd agents doctor [name]` that checks whether configured agents are available on the system.

#### Scenario: Detect all agents

- **WHEN** user runs `cyrusd agents doctor` with no arguments
- **THEN** the CLI runs detection for all registered agents and prints healthy/unhealthy status for each

#### Scenario: Detect specific agent

- **WHEN** user runs `cyrusd agents doctor cursor`
- **THEN** the CLI runs detection only for `cursor` and prints the result with install hints if unavailable

### Requirement: No install commands

The CLI SHALL NOT provide any command that installs, downloads, or manages agent packages. Users MUST install agents outside the Cyrus ecosystem (npm, brew, manual download).

#### Scenario: No install subcommand

- **WHEN** user runs `cyrusd agents install cursor`
- **THEN** the CLI reports that the command does not exist and directs the user to install the agent externally and configure `~/.cyrus/agents.yml`

#### Scenario: Detect hints at external install only

- **WHEN** `cyrusd agents doctor` finds an agent unavailable
- **THEN** the CLI prints an external install hint (e.g. `npm i -g @zed-industries/claude-code-acp`) but does not perform installation

### Requirement: Worker capability advertisement

The worker SHALL advertise only detected-and-available agents in `listAgents` when joining the signaling room.

#### Scenario: Only available agents advertised

- **WHEN** the worker starts and `cursor` is detected but `codex` is not
- **THEN** `listAgents` includes `cursor` and excludes `codex`
