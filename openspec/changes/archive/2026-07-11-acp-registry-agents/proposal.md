## Why

> **Implementation note:** The shipped implementation uses native TypeScript registry cache I/O and spawn resolution in `core/registry` (acpr is not used). See `openspec/specs/acp-registry/spec.md` for the authoritative requirements.

Users currently register ACP agents manually (`cyrusd agents add <name> --cmd <command>`), with no discovery, icons, or registry metadata. The [ACP Agent Registry](https://agentclientprotocol.com/get-started/registry) provides canonical agent ids, display names, icons, and spawn recipes. Cyrus should use it for discovery and delegate spawn resolution to [acpr](https://crates.io/crates/acpr), while keeping a user-curated enabled set in `agents.yml`.

## What Changes

- **BREAKING**: Replace manual `--cmd`/`--args` agent registration with registry-id-based `cyrusd agents add <registry-id>`
- **BREAKING**: `agents.yml` stores metadata only (`registryId`, `name`, `icon`) — no spawn recipes
- **BREAKING**: Agent identity is the registry id (e.g. `claude-acp`); remove `agents update` command
- Add `cyrusd agents registry list` and `cyrusd agents registry sync` (delegates cache to acpr)
- Spawn all agents via bundled acpr sidecar extracted from compiled `cyrusd`
- Extend `listAgents` wire output with `name` and `icon` for composer rendering
- Embed acpr per platform in compiled binaries for npm distribution (no postinstall downloads)
- Remove PATH-based availability filtering from `listAgents`; doctor handles health checks

## Capabilities

### New Capabilities

- `acp-registry`: ACP registry cache integration (read via acpr cache, sync, list UX)
- `acpr-bundling`: Embed and extract acpr binary in compiled cyrusd for npm/platform packages

### Modified Capabilities

- `acp-provider-config`: agents.yml schema changes from command/args to registry metadata
- `acp-provider-cli`: New registry subcommands, revised add/rm/list/doctor, remove update and manual cmd registration
- `acp-process-manager`: Spawn path uses acpr subprocess instead of direct command/args

## Impact

- `apps/cli`: agents store, commands, acp pool/profile, acpr path resolution, build pipeline
- `shared/schemas`: `RegisteredAgentSchema` gains `icon`, uses registry id
- `apps/web`: composer agent picker renders icons from wire data
- CI/release: per-platform builds embed acpr from cargo-quickinstall; npm optional platform packages
- OpenSpec: `acp-provider-config`, `acp-provider-cli` requirement updates

## Non-goals

- Runnable/availability column in registry list (doctor only)
- Custom agents not in the ACP registry
- Backward compatibility with existing `agents.yml` command/args entries
- Cyrus-owned registry fetch/write (acpr owns cache at `~/.cyrus/acp`)
- Installing agent packages directly (acpr handles npx/uvx/binary at spawn time)
