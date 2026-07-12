## Context

Cyrus workers run external ACP agents via `AgentPool` (subprocess + `initialize`) and `AgentRuntime` (thread → session map in memory). Catalog RPCs (`getModels`, etc.) call `getProbeSession()`, which creates a disposable session in `homedir()` — wrong cwd and unrelated to the user's thread. Agent selection is client-only (Zustand) until the first `chat()` call writes `agentName` via `ensureThread`.

Zed's external-agent model: subprocess `initialize` once per agent type; `newSession({ cwd: project })` when opening a draft thread; catalog and slash commands come from the session response. Agent switch on empty draft closes and recreates session.

**PR #49 context (merged):** Web composer now uses `apps/web/src/components/chat/composer/agent-model-picker.tsx` for agent+model selection and exposes `modelsLoading` from `useAgentCatalog`. Effort/persona live in `compact-composer-controls.tsx`. Bind integration and agent-lock UX must target these components.

## Goals / Non-Goals

**Goals:**

- One Cyrus thread = one ACP session, created at agent bind time (before first message)
- Persist `agentName` + `sessionId` in Turso; recover via `session/resume` on worker restart
- Thread-scoped catalog RPCs (no probe session)
- Lock agent after first turn; `closeSession` on delete and draft agent switch
- `listAgents` returns only healthy agents (doctor at list time, cached briefly)

**Non-Goals:**

- Agent auth, permissions, elicitation, prompt queue, slash commands UI
- `listSessions` (Turso is thread index)
- Client health dashboard

## Decisions

### 1. `bindAgent` RPC replaces implicit catalog-on-probe

**Choice:** New controller method `bindAgent({ threadId, projectId, agentName })` creates draft session, persists fields, returns catalog snapshot.

**Alternatives:** Keep agent-scoped catalog + probe session — rejected (wrong cwd, session leak).

**Flow:**

```text
bindAgent → pool.getRuntime(agentName)  // initialize once
         → closeSession if thread had different agent/session
         → newSession({ cwd: project.cwd })
         → UPDATE threads SET agent_name, session_id
         → return { models, modes, efforts, personas, capabilities }
```

Catalog getters (`getModels`, etc.) require `threadId` and read from bound session — **BREAKING** input shape change.

### 2. Thread schema additions

```sql
ALTER threads ADD session_id TEXT;      -- nullable until bind
ALTER threads ADD agent_locked INTEGER DEFAULT 0;  -- 1 after first turn
```

`agentName` nullable on create; set on bind. `sessionId` set on bind. `agentLocked` set on first persisted user turn.

### 3. First message reuses bound session

`requireSession()` loads from DB if not in memory. If `sessionId` present, call `resumeSession` (or attach existing runtime session). Do **not** call `newSession` again.

### 4. Agent switch rules

| State | Switch allowed? | Action |
|-------|-----------------|--------|
| Draft (no conversation entries) | Yes | `closeSession(old)` → `newSession(new)` |
| Active (`agentLocked`) | No | RPC error |
| Same agent re-bind | Idempotent | Return existing catalog |

### 5. Delete thread cleanup

`deleteThread` handler calls `closeSession(sessionId)` best-effort before DB delete.

### 6. Worker restart recovery

On worker boot (or first use of agent): for threads with `session_id IS NOT NULL`, attempt `openOrCreateRuntimeSession({ sessionId, cwd })` using resume preference per existing spec.

In-memory map rehydrated from DB on demand.

### 7. Healthy agents only in `listAgents`

Run doctor check (spawn + initialize) with short TTL cache (e.g. 60s per agent). Unhealthy agents omitted from RPC response. CLI `cyrusd agents list` still shows all enabled (unchanged).

**Alternative:** Background health poller — deferred; synchronous cache on first list per interval is sufficient.

### 8. Remove `getProbeSession()`

Delete entirely. All catalog paths require bound thread session.

## Risks / Trade-offs

- **[Risk] bindAgent latency on agent switch** → Reuse `modelsLoading` spinner in `AgentModelPicker` model column during bind; cache catalog client-side until model change
- **[Risk] Orphan sessions if bind succeeds but DB write fails** → Write DB first with pending state, or close session on rollback
- **[Risk] resume fails after long idle** → Emit error event (UX change); user may need new thread
- **[Risk] listAgents slow with many agents** → TTL cache; parallel doctor with timeout

## Migration Plan

1. Add nullable columns with migration (existing threads: `session_id = null`, re-bind on open)
2. Deploy worker with `bindAgent`; update clients to call bind on agent select
3. Change catalog RPC inputs to require `threadId` (**breaking** for clients)
4. Remove probe session code
5. Existing threads with conversation history: treat as locked; bind only if `agentName` set and no lock yet

## Open Questions

- Should `bindAgent` be called automatically when opening a thread with saved `agentName` but no in-memory session? **Yes** — client or worker lazy-bind on thread open.
