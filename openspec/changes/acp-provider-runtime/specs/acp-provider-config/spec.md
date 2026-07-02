## ADDED Requirements

### Requirement: Built-in provider defaults

The worker SHALL ship built-in provider definitions for known ACP-compatible agents, each specifying `id`, `command`, `args`, `env`, and `detect` configuration.

#### Scenario: Defaults available without user config

- **WHEN** no `~/.cyrus/providers.yml` exists
- **THEN** the worker loads built-in provider definitions for at least `claude-code` and `gemini`

### Requirement: User provider overrides

The worker SHALL load `~/.cyrus/providers.yml` and merge it over built-in defaults, allowing users to enable/disable providers, override spawn commands, or add custom providers.

#### Scenario: User disables a provider

- **WHEN** `providers.yml` sets `claude-code.enabled: false`
- **THEN** the merged config excludes `claude-code` from active providers

#### Scenario: User overrides spawn command

- **WHEN** `providers.yml` overrides `claude-code.command` to a custom path
- **THEN** the merged config uses the user-provided command when spawning

### Requirement: Provider config schema validation

The worker SHALL validate provider configuration against a Zod schema and reject invalid configs with a descriptive error.

#### Scenario: Invalid config file

- **WHEN** `providers.yml` contains a provider entry missing required `command` field
- **THEN** the worker reports a validation error and refuses to start provider runtime

### Requirement: Environment variable interpolation

The worker SHALL support `${env:VAR_NAME}` syntax in provider `env` values, resolving from the process environment at spawn time.

#### Scenario: API key from environment

- **WHEN** a provider env entry is `ANTHROPIC_API_KEY: ${env:ANTHROPIC_API_KEY}`
- **THEN** the spawned subprocess receives the value of `ANTHROPIC_API_KEY` from the worker's environment
