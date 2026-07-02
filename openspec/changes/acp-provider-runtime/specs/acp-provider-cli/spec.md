## ADDED Requirements

### Requirement: Provider list command

The CLI SHALL provide `cyrus provider list` that displays all configured providers and their enabled status.

#### Scenario: List all providers

- **WHEN** user runs `cyrus provider list`
- **THEN** the CLI prints each provider's `id`, enabled status, and configured command

### Requirement: Provider detect command

The CLI SHALL provide `cyrus provider detect [id]` that checks whether configured providers are available on the system.

#### Scenario: Detect all providers

- **WHEN** user runs `cyrus provider detect` with no arguments
- **THEN** the CLI runs detection for all enabled providers and prints available/unavailable status for each

#### Scenario: Detect specific provider

- **WHEN** user runs `cyrus provider detect claude-code`
- **THEN** the CLI runs detection only for `claude-code` and prints the result with install hints if unavailable

### Requirement: No install commands

The CLI SHALL NOT provide any command that installs, downloads, or manages provider packages. Users MUST install providers outside the Cyrus ecosystem (npm, brew, manual download).

#### Scenario: No install subcommand

- **WHEN** user runs `cyrus provider install claude-code`
- **THEN** the CLI reports that the command does not exist and directs the user to install the provider externally and configure `~/.cyrus/providers.yml`

#### Scenario: Detect hints at external install only

- **WHEN** `cyrus provider detect` finds a provider unavailable
- **THEN** the CLI prints an external install hint (e.g. `npm i -g @zed-industries/claude-code-acp`) but does not perform installation

### Requirement: Worker capability advertisement

The worker SHALL advertise only detected-and-available providers in `WorkerCapabilities.agents` when joining the signaling room.

#### Scenario: Only available providers advertised

- **WHEN** the worker starts and `claude-code` is detected but `codex` is not
- **THEN** `WorkerCapabilities.agents` includes `claude-code` and excludes `codex`
