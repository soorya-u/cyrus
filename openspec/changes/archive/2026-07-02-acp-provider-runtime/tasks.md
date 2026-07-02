## 1. Dependencies and validators

- [x] 1.1 Add `@agentclientprotocol/sdk` to `apps/cli/package.json`
- [x] 1.2 Create `src/validators/name.ts` with shared agent name schema
- [x] 1.3 Create `src/validators/agent.ts` with `agentEntrySchema` and CLI input schemas
- [x] 1.4 Create `src/validators/cli.ts` with `nameArgParser` and `parseCli`

## 2. Agent registry

- [x] 2.1 Create `src/store/agents.ts` — read/write `~/.cyrus/agents.yml` with better-result
- [x] 2.2 Add `AGENTS_FILE` constant (`agents.yml`) to `src/constants/file.ts`
- [x] 2.3 Implement `listAgents`, `getAgent`, `addAgent`, `updateAgent`, `removeAgent`
- [ ] 2.4 Implement `${env:VAR}` interpolation for agent env values (when env is added to schema)

## 3. ACP doctor ping

- [x] 3.1 Create `src/acp/ping.ts` using `Bun.spawn` and Web Streams for ACP `initialize`
- [x] 3.2 Return agent info or error with stderr detail on failure

## 4. ACP client wrapper

- [x] 4.1 Create `src/acp/client.ts` wrapping ACP SDK client with `Bun.spawn` stdio
- [x] 4.2 Implement `initialize()` handshake and capability inspection
- [x] 4.3 Implement `newSession({ cwd, mcpServers })` and `prompt({ sessionId, content })`
- [x] 4.4 Implement `cancel(sessionId)` and `close(sessionId)` where supported
- [x] 4.5 Create `src/acp/events.ts` with ACP `session/update` → `AgentEvent` mapping

## 5. Process manager

- [x] 5.1 Create `src/acp/process-manager.ts` with per-agent subprocess tracking
- [x] 5.2 Implement spawn via `Bun.spawn`: command/args, wire stdio to ACP client
- [x] 5.3 Track state transitions: `stopped` → `starting` → `ready` → `crashed`
- [x] 5.4 Implement lazy spawn: no subprocess at worker start, spawn on first agent use
- [x] 5.5 Implement 30-minute idle timer per agent; reset on activity, kill on expiry
- [x] 5.6 Listen for subprocess exit and mark `crashed`
- [x] 5.7 Implement auto-respawn on next use after crash or idle shutdown
- [x] 5.8 Implement graceful shutdown: kill all subprocesses on SIGINT/SIGTERM

## 6. Session router

- [x] 6.1 Create `src/acp/session-router.ts` with `Map<threadId, sessionId>` per agent
- [x] 6.2 Implement `getOrCreateSession(threadId, cwd)` calling ACP `session/new`
- [x] 6.3 Implement session recovery after respawn: try `session/resume`, fallback `session/load`
- [x] 6.4 Wire `prompt(threadId, content)` → `session/prompt` on mapped sessionId
- [x] 6.5 Stream `session/update` notifications through event mapper

## 7. CLI commands (`cyrusd agents`)

- [x] 7.1 Create `src/commands/agents/index.ts` and register on program
- [x] 7.2 Implement `cyrusd agents list`
- [x] 7.3 Implement `cyrusd agents add <name> --cmd <command> [--args ...]`
- [x] 7.4 Implement `cyrusd agents rm <name>`
- [x] 7.5 Implement `cyrusd agents update <name> [--cmd] [--args ...]`
- [x] 7.6 Implement `cyrusd agents doctor [name]` — PATH check + ACP handshake (+ worker status)
- [x] 7.7 Validate CLI inputs in `index.ts` via Zod (`nameArgParser`, `parseCli`)

## 8. Worker integration

- [x] 8.1 Instantiate process manager and session router in worker (no spawn at startup)
- [x] 8.2 Load registered agents from `agents.yml` on worker start
- [x] 8.3 Add controller RPC to list available agents (not via signaling join)
- [x] 8.4 Shut down process manager on worker SIGINT/SIGTERM (integrate with existing handler)

## 9. Verification

- [x] 9.1 Manual test: `cyrusd agents list` with no config file
- [x] 9.2 Manual test: `cyrusd agents add/rm` round-trip
- [ ] 9.3 Manual test: `cyrusd agents doctor` with a known-installed agent
- [ ] 9.4 Manual test: lazy spawn on first prompt, reuse on second, shutdown after 30 min idle
- [x] 9.5 Run `bun check:types` for `@cyrus/cli`
- [x] 9.6 Run `bun check` (ultracite) for repo
