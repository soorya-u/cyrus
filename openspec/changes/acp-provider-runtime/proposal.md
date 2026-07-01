## Why

The Cyrus worker must run arbitrary coding agents through a common interface without bundling every agent SDK or managing user installations. The Agent Client Protocol (ACP) provides that wire-level adapter: the worker acts as an ACP client, while users install agent binaries or bridge packages themselves. We need a provider runtime that detects, spawns, and manages long-lived ACP server processes per provider.

## What Changes

- Add an ACP client layer in `apps/cli` using `@agentclientprotocol/sdk`
- Add a `providers.yml` config (built-in defaults + user overrides at `~/.cyrus/providers.yml`) defining spawn commands, args, env, and detect checks
- Add a `ProviderProcessManager` — lazy-spawn subprocess on first use per provider, keep alive for subsequent requests, shut down after 30 minutes of inactivity, with crash detection and respawn
- Map Cyrus threads to ACP `sessionId` values (one ACP process, many sessions across projects)
- Add `cyrus provider list` and `cyrus provider detect` read-only commands only — no `cyrus provider install`; users install agents outside the Cyrus ecosystem (npm, brew, manual)
- Advertise detected providers in `WorkerCapabilities.agents`
- Stream ACP `session/update` notifications as Cyrus `AgentEvent`s to connected UI peers

## Capabilities

### New Capabilities

- `acp-provider-config`: Provider manifest schema, built-in defaults, and `~/.cyrus/providers.yml` merge/override rules
- `acp-process-manager`: Per-provider subprocess lifecycle (lazy spawn, 30-minute idle shutdown, health, crash recovery, worker shutdown)
- `acp-session-router`: Thread-to-session mapping, `session/new`, `session/prompt`, resume via `session/load` or `session/resume`
- `acp-provider-cli`: Read-only CLI commands for listing and detecting configured providers

### Modified Capabilities

<!-- none — no existing openspec specs yet -->

## Non-goals

- Any `cyrus provider install` command or in-ecosystem package management — users install providers outside Cyrus (npm, brew, manual)
- Publishing a provider registry or downloading artifacts from GitHub releases
- Building custom ACP bridge packages (separate effort; worker only spawns what user installed)
- Local DB persistence for ACP session IDs (deferred; session router holds in-memory state initially)
- UI for provider configuration (CLI config file only for now)

## Impact

- `apps/cli`: new provider runtime modules, ACP client integration, CLI commands, worker capability advertisement
- `~/.cyrus/providers.yml`: new user config file alongside existing `config.yml`
- New dependency: `@agentclientprotocol/sdk` in `@cyrus/cli`
- Worker prompt handling path (future): delegates to `AcpAgentRuntime` instead of stubs
