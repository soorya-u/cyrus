## Context

The Cyrus worker (`apps/cli`) currently registers with the signaling server and serves stub oRPC handlers. Agent execution is planned via an `AgentRuntime` interface, with ACP as the wire protocol between worker and agent subprocesses.

ACP defines a client/server model over stdio JSON-RPC: one agent subprocess can host **multiple sessions** (each with its own `cwd` and conversation history). Cyrus threads map to ACP `sessionId` values. Users install agent binaries or bridge packages themselves; the worker only detects, spawns, and communicates.

## Goals / Non-Goals

**Goals:**

- Worker acts as ACP client using `@agentclientprotocol/sdk`
- Config-driven provider definitions (`providers.yml`) with built-in defaults
- Lazy-spawn subprocess per provider on first use, keep alive for subsequent requests, shut down after 30 minutes of inactivity, multiplexing many sessions while running
- Crash detection and automatic respawn with session recovery where supported
- Read-only CLI for listing and detecting providers
- Advertise only detected providers in `WorkerCapabilities`

**Non-Goals:**

- Package installation, registry downloads, or version management
- Custom ACP bridge package development
- Persistent session storage in local DB (phase 2)
- Prompt routing from WebRTC to ACP (phase 2; this change builds the runtime foundation)

## Decisions

### 1. ACP client in worker core, providers as spawn recipes

**Decision:** Bundle `@agentclientprotocol/sdk` in `@cyrus/cli`. Providers are config entries (command/args/env), not installable npm packages managed by the worker.

**Rationale:** Matches the LSP model — user installs tools, host knows how to run them. Avoids coupling to user's npm/pnpm/bun setup and works with the compiled `cyrusd` binary.

**Alternatives considered:**
- `~/.cyrus` bun project with `bun add` providers — rejected; requires bun on user machine, fights compiled binary distribution
- Import every agent SDK directly — rejected; N SDKs, N auth flows, N event shapes in worker

### 2. Lazy spawn, reuse, idle shutdown

**Decision:** `ProviderProcessManager` spawns an ACP agent subprocess **on first use** for a provider (not at worker startup). The subprocess stays alive for subsequent requests on that provider. After **30 minutes of inactivity** (no prompts, no active sessions), the worker terminates the subprocess. Sessions are created via `session/new` with per-thread `cwd` while the subprocess is running.

**Rationale:** Avoids holding agent processes when unused, while keeping warm processes for active workflows. ACP supports multiplexed sessions on one connection — no need to respawn per thread.

**Alternatives considered:**
- Spawn at worker startup — rejected; wastes resources for providers never used in a session
- One subprocess per thread — rejected; resource-heavy, unnecessary per ACP spec
- Never shut down idle processes — rejected; memory leak risk for background workers

### 3. Config merge: built-in defaults + user overrides

**Decision:** Ship built-in provider recipes in code. User overrides at `~/.cyrus/providers.yml` can enable/disable providers, override `command`/`args`/`env`, or add custom providers.

**Rationale:** Zero-config for common agents; power users can point to custom binaries or bridge packages.

### 4. Process manager with crash recovery

**Decision:** Track subprocess state (`idle`, `starting`, `ready`, `crashed`). On crash, respawn and attempt `session/resume` (preferred) or `session/load` (fallback) for active sessions.

**Rationale:** Long-lived processes will crash; Cyrus must recover gracefully without user intervention.

**Alternatives considered:**
- Respawn per prompt — rejected; loses session state, slow
- No respawn (fail hard) — rejected; poor UX for a background worker

### 5. No install command — users install outside Cyrus

**Decision:** `cyrus provider list` and `cyrus provider detect` only. There is **no** `cyrus provider install`. Users install agent binaries or bridge packages outside the Cyrus ecosystem (npm, brew, manual download). `detect` may print install hints but never performs installation.

**Rationale:** Clear separation — installation is entirely the user's responsibility; the worker only detects, spawns, and communicates.

### 6. Module layout in `apps/cli`

```
src/
  acp/
    client.ts          # ClientSideConnection wrapper
    events.ts          # ACP session/update → AgentEvent mapping
  providers/
    config.ts          # Zod schema, load + merge defaults
    defaults.ts        # Built-in provider recipes
    detect.ts          # detect() implementation
    process-manager.ts # spawn, health, crash recovery
    session-router.ts  # threadId ↔ sessionId mapping
    types.ts           # Provider, ProcessHandle interfaces
  commands/provider/
    list.ts
    detect.ts
    index.ts
```

## Risks / Trade-offs

- **[Risk] Not all agents multiplex sessions reliably** → Start with one process per provider; add per-provider concurrency limits if needed
- **[Risk] Session recovery depends on agent capabilities** → Detect `loadSession`/`resume` at init; surface capability gaps in `provider detect` output
- **[Risk] Compiled binary + dynamic provider loading** → Providers are external subprocesses, not dynamically imported modules; no conflict with `bun build --compile`
- **[Risk] Concurrent prompts on same provider** → Session router tracks in-flight prompts per sessionId; ACP supports parallel sessions
- **[Risk] Memory growth with many sessions** → 30-minute idle shutdown reclaims subprocess resources; sessions restored via load/resume on next prompt

## Migration Plan

1. Add `@agentclientprotocol/sdk` dependency and provider modules (no worker behavior change)
2. Add `providers.yml` support and CLI commands
3. Integrate process manager into worker (lazy spawn on first use, idle shutdown after 30 min)
4. Wire session router into prompt path (follow-up change)

No rollback concerns — additive change behind new modules.

## Open Questions

- Which built-in providers to ship in defaults? (claude-code-acp, gemini --experimental-acp, codex-acp)
- Should idle timeout be configurable in `providers.yml`? (default 30 min; defer config override to phase 2)
