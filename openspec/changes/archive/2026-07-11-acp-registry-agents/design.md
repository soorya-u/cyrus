## Context

Cyrus CLI currently stores user-registered agents in `~/.cyrus/agents.yml` as `{ command, args }` spawn recipes. Users discover and install ACP bridge packages manually. The worker spawns agents directly via `@acp-kit/core` child-process transport and filters `listAgents` by PATH availability.

The [ACP Agent Registry](https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json) provides canonical ids, display metadata, icons, and distribution recipes. [acpr](https://crates.io/crates/acpr) (v0.3.0) resolves registry entries and spawns agents via npx/uvx/binary download, caching at a configurable `--cache-dir`.

Cyrus distributes `cyrusd` as a Bun-compiled single binary and plans npm platform packages. npm postinstall download scripts are unreliable; acpr must ship embedded in the compiled artifact.

## Goals / Non-Goals

**Goals:**

- Browse ACP registry from CLI; add agents by registry id
- Store enabled agents in `agents.yml` as metadata only (`registryId`, `name`, `icon`)
- Spawn via extracted acpr binary: `acpr <registryId> --cache-dir ~/.cyrus/acp`
- Delegate registry cache read/write to acpr (Cyrus reads cached JSON for display only)
- Expose `id`, `name`, `icon` in `listAgents` for composer rendering
- Embed acpr per platform in compiled cyrusd for npm distribution
- Warn (not fail) on cheap preflight issues at add time; doctor for full health checks

**Non-Goals:**

- Runnable column in registry list
- Custom/non-registry agents
- Backward compatibility with old `agents.yml` format
- Cyrus-owned registry CDN fetch
- Replacing acpr's spawn-time package/binary resolution

## Decisions

### 1. Three-layer model: catalog → enabled → spawn

**Decision:** Separate ACP registry (catalog), `agents.yml` (user-enabled set), and acpr (spawn resolver).

**Rationale:** Users don't have every agent installed. Composer shows only enabled agents; registry list is discovery-only.

### 2. agents.yml stores metadata + registryId only

**Decision:**

```yaml
claude-acp:
  registryId: claude-acp
  name: Claude Agent
  icon: https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg
```

Registry id is the map key and thread `agentName`. No `command`/`args`.

**Alternatives considered:**

- Store resolved cmd/args at add time — rejected; duplicates acpr resolution and drifts on registry updates

### 3. acpr owns registry cache; Cyrus reads only

**Decision:** Shared cache dir `~/.cyrus/acp`. Sync via `acpr --list --force registry --cache-dir ~/.cyrus/acp`. Cyrus reads `~/.cyrus/acp/registry.json` for rich metadata (name, icon) but never writes cache files.

**Rationale:** Single source of truth for TTL, fetch, and binary cache layout.

### 4. Spawn via acpr subprocess, not direct command

**Decision:** `AgentProfile` resolves to `{ command: acprPath, args: [registryId, "--cache-dir", acpCacheDir] }`. acpr acts as stdio conductor to the inner agent.

**Alternatives considered:**

- Reimplement npx/uvx/binary resolution in TS — rejected
- Bun FFI to acpr lib — rejected; no C ABI, high maintenance

### 5. Embed acpr in compiled cyrusd; extract on first use

**Decision:** CI downloads acpr prebuilt from [cargo-quickinstall](https://github.com/cargo-bins/cargo-quickinstall) per target, embeds via `import acprBin from "../assets/acpr" with { type: "file" }`, compile with `bun build --compile`. At runtime (standalone only), extract to `~/.cyrus/bin/acpr` with version stamp; re-extract when embedded rev changes.

**Rationale:** npm cannot rely on postinstall downloads. Embedded bytes + extract satisfies single-artifact distribution.

**Dev mode:** `CYRUS_ACPR_PATH` or `Bun.which("acpr")` — no embed required when running `bun src/cli.ts`.

**Alternatives considered:**

- install.sh sidecar only — rejected for npm path
- Submodule + cargo build in CI — rejected; quickinstall prebuilts sufficient for linux-x64, darwin x64/arm64

### 6. npm platform packages

**Decision:** Publish `@cyrus/cli` meta package with `optionalDependencies` on `@cyrus/cli-{platform}-{arch}` packages, each containing the fat compiled binary. Thin JS wrapper resolves platform package at runtime. No postinstall scripts.

### 7. Registry list UX

**Decision:** `cyrusd agents registry list` prints registry ids only. Color: green if id is in `agents.yml`, blue otherwise. No name column, no runnable column. Uses cached registry (implicit sync via `acpr --list` if stale).

### 8. Add preflight: warn by default

**Decision:** `agents add <id>` validates registry id exists, checks cheap static constraints (platform support for binary-only agents, npx/uvx on PATH). Fail on unknown id or unsupported platform; warn on missing runtime deps. Full ACP handshake deferred to `agents doctor`.

### 9. listAgents returns all enabled agents

**Decision:** Remove PATH filtering from `listAgents`. Return all `agents.yml` entries with `id`, `name`, `icon`. Availability is not composer's concern.

**Rationale:** Spawn failures surface at runtime; doctor verifies proactively.

### 10. Remove agents update command

**Decision:** Registry metadata is authoritative. Re-add after registry sync if metadata changes. No manual cmd/args overrides.

## Risks / Trade-offs

- **[Risk] quickinstall missing linux-arm64 / windows acpr builds** → Build those targets in CI via `cargo install` and host alongside npm packages; document gap
- **[Risk] acpr experimental (v0.3.0), API churn** → Pin acpr version in embed rev file; subprocess boundary limits blast radius
- **[Risk] Double-hop latency (cyrus → acpr → agent)** → Acceptable for background worker; measure in manual test
- **[Risk] Extracted acpr stale after cyrusd upgrade** → Version stamp at `~/.cyrus/bin/.acpr-rev` triggers re-extract
- **[Risk] Old agents.yml breaks on upgrade** → Document breaking change; no migration (explicit non-goal)

## Migration Plan

1. Ship breaking CLI release with new commands and schema
2. Users run `cyrusd agents registry sync`, `cyrusd agents add <id>` for each desired agent
3. Delete old `agents.yml` entries with `command`/`args` manually (no auto-migration)
4. Rollback: revert to previous cyrusd release and restore old `agents.yml` backup

## Open Questions

- Pin acpr at `0.3.0` or track latest quickinstall release in CI?
- npm platform package naming: `@cyrus/cli-linux-x64` vs `@cyrus/cli-linux-x64-gnu`?
- Composer icon rendering: inline `<img>` vs local cache for offline?
