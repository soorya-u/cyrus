## ADDED Requirements

### Requirement: Shared acpr cache directory

The CLI SHALL use `~/.cyrus/acp` as the acpr `--cache-dir` for all acpr invocations (registry sync, spawn). acpr SHALL own read/write of cache files including `registry.json`, `registry_cache.json`, and downloaded binaries.

#### Scenario: Cache directory created on first use

- **WHEN** any acpr command runs and `~/.cyrus/acp` does not exist
- **THEN** the directory is created before acpr executes

### Requirement: Registry sync command

The CLI SHALL provide `cyrusd agents registry sync` that forces acpr to refresh the registry cache from the ACP CDN.

#### Scenario: Force registry refresh

- **WHEN** user runs `cyrusd agents registry sync`
- **THEN** the CLI invokes `acpr --list --force registry --cache-dir ~/.cyrus/acp` and reports success or failure

### Requirement: Registry list command

The CLI SHALL provide `cyrusd agents registry list` that displays all agent ids from the cached ACP registry.

#### Scenario: List registry ids with added indicator

- **WHEN** user runs `cyrusd agents registry list`
- **THEN** the CLI prints each registry agent id, coloring ids present in `agents.yml` distinctly from ids not yet added

#### Scenario: Implicit cache warm on list

- **WHEN** user runs `cyrusd agents registry list` and the registry cache is missing or stale
- **THEN** the CLI invokes acpr to warm the cache before reading `registry.json`

#### Scenario: Read registry metadata from cache

- **WHEN** the CLI needs registry metadata (name, icon, distribution) for add or display
- **THEN** it reads `~/.cyrus/acp/registry.json` and does not fetch the CDN directly

### Requirement: Registry id validation on add

The CLI SHALL reject `cyrusd agents add <id>` when `<id>` is not found in the cached registry.

#### Scenario: Unknown registry id

- **WHEN** user runs `cyrusd agents add unknown-agent` and the id is not in the cached registry
- **THEN** the CLI fails with an error suggesting `cyrusd agents registry sync`
