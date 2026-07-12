## Why

Cyrus discovers agent catalog options via a throwaway probe session in `homedir()`, while real sessions are created only on first prompt. Agent selection lives in client memory until chat starts. This mismatch causes wrong cwd-scoped catalog data, orphaned sessions, and lost ACP state on worker restart. External-agent parity requires binding one thread to one draft session at agent-select time, persisting that binding, and cleaning up on delete.

## What Changes

- Add `sessionId` (and optional lock flag) to `threads` table; persist `agentName` when user selects agent, not only on first message
- Add `bindAgent` controller RPC: subprocess init (pool) + `session/new` with project `cwd`, persist session, return catalog snapshot
- Remove `getProbeSession()`; make all catalog RPCs thread-scoped (require bound session)
- Lock `agentName` after first conversation turn; reject agent changes on active threads
- Call `closeSession` when thread deleted or agent switched on draft thread
- Recover sessions from DB on worker start via `session/resume` (fallback `session/load`)
- Filter `listAgents` to healthy agents only (doctor check); no health UI on client

## Capabilities

### New Capabilities

- `acp-draft-session`: Draft-thread agent binding, session creation at select time, agent lock, and session cleanup rules

### Modified Capabilities

- `acp-session-router`: Session created at bind time (not first prompt); DB-backed mapping; resume on worker restart
- `conversation-persistence`: `threads` schema adds `sessionId`; `agentName` written on bind
- `acp-provider-cli`: `listAgents` returns only agents passing doctor/initialize health check
- `wire-schemas`: `bindAgent` RPC, thread-scoped catalog inputs, `ThreadSchema` session fields

## Non-goals

- Agent auth/login flows
- Interactive permissions or elicitation (separate future change)
- Terminal creation, MCP forwarding, fork session
- `listSessions` / agent-side thread history (Turso is source of truth for thread list)
- Client-side agent health display

## Prerequisites

Merged in [#49](https://github.com/soorya-u/cyrus/pull/49): web composer uses `AgentModelPicker` (combined agent+model) with `modelsLoading` from `useAgentCatalog`. Client integration targets that picker, not the pre-PR inline footer selects.

## Impact

- `shared/database`: migration for `threads.session_id`, optional `agent_locked`
- `apps/cli`: `AgentRuntime`, `ThreadCoordinator`, new `bindAgent` handler, delete-thread cleanup
- `shared/connections`, `shared/schemas`: new RPC + wire types
- `shared/hooks`: `useAgentCatalog` becomes bind-driven per thread; extend `modelsLoading` to cover `bindAgent` in-flight
- `apps/web`: wire `bindAgent` into `agent-model-picker.tsx`; disable agent column when `agentLocked`
- Depends on: existing `AgentPool`, registry spawn, `@acp-kit/core`, PR #49 composer UI
