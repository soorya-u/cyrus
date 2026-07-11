# ACP Registry

## Purpose

Integrate the [ACP Agent Registry](https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json) for agent discovery, caching, and spawn resolution. Cyrus owns registry cache I/O and native TypeScript spawn resolution in `core/registry` (acpr is not used).

## Requirements

### Requirement: Shared registry cache directory

The CLI SHALL use `~/.cyrus/acp` as the registry cache directory for `registry.json`, `registry_cache.json`, and downloaded agent binaries.

#### Scenario: Cache directory created on first use

- **WHEN** any registry read or sync runs and `~/.cyrus/acp` does not exist
- **THEN** the directory is created before cache access

### Requirement: Registry sync command

The CLI SHALL provide `cyrusd agents registry sync` that refreshes the registry cache from the ACP CDN.

#### Scenario: Force registry refresh

- **WHEN** user runs `cyrusd agents registry sync`
- **THEN** the CLI fetches the registry from the CDN, writes `registry.json` and cache metadata, and reports success or failure

### Requirement: Registry browse command

The CLI SHALL provide `cyrusd agents registry` that displays all agent ids from the cached ACP registry.

#### Scenario: List registry ids with enabled indicator

- **WHEN** user runs `cyrusd agents registry`
- **THEN** the CLI prints each registry agent id, coloring ids present in `agents.yml` green and other ids in normal terminal color

#### Scenario: Implicit cache warm on browse

- **WHEN** user runs `cyrusd agents registry` and the registry cache is missing or stale
- **THEN** the CLI refreshes or warms the cache before reading `registry.json`

#### Scenario: Read registry metadata from cache

- **WHEN** the CLI needs registry metadata (name, icon, distribution) for add or display
- **THEN** it reads `~/.cyrus/acp/registry.json` via the store layer

### Requirement: Native spawn resolution

The CLI SHALL resolve registry distribution recipes (npx, uvx, binary) in TypeScript and spawn the resolved command directly. The worker SHALL NOT shell out to acpr.

#### Scenario: npx-distributed agent

- **WHEN** an enabled agent's registry entry specifies npx distribution
- **THEN** the worker spawns `npx` with the registry package and args

#### Scenario: Binary-distributed agent

- **WHEN** an enabled agent's registry entry specifies a binary for the current platform
- **THEN** the CLI downloads and caches the binary under `~/.cyrus/acp/<agent-id>/` and spawns it

### Requirement: Registry id validation on add

The CLI SHALL reject `cyrusd agents add <id>` when `<id>` is not found in the cached registry.

#### Scenario: Unknown registry id

- **WHEN** user runs `cyrusd agents add unknown-agent` and the id is not in the cached registry
- **THEN** the CLI fails with an error suggesting `cyrusd agents registry sync`
