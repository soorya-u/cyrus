## 1. Schema and persistence

- [ ] 1.1 Add `session_id` and `agent_locked` columns to `threads` model and migration
- [ ] 1.2 Extend `ThreadSchema` with `sessionId` and `agentLocked` optional fields
- [ ] 1.3 Add repository helpers: `bindThreadAgent`, `setAgentLocked`, `getThreadSession`

## 2. Wire contracts

- [ ] 2.1 Define `BindAgentInput`/`BindAgentOutput` schemas and controller contract
- [ ] 2.2 Add `threadId` to catalog input schemas (`getModels`, `getModes`, `getEfforts`, `getPersonas`, setters)
- [ ] 2.3 Update `shared/constants/operation-keys` for new/changed RPC keys

## 3. Worker runtime

- [ ] 3.1 Implement `bindAgent` in `AgentRuntime` (newSession, persist, return catalog snapshot)
- [ ] 3.2 Remove `getProbeSession()`; route catalog reads through thread-bound session
- [ ] 3.3 Update `requireSession()` to hydrate from DB and resume existing sessionId
- [ ] 3.4 Implement agent switch on draft (closeSession + newSession) and lock enforcement
- [ ] 3.5 Set `agentLocked` on first persisted user message in chat handler
- [ ] 3.6 Call `closeSession` in delete-thread handler before DB delete

## 4. Agent health filtering

- [ ] 4.1 Add health cache module with TTL wrapping existing doctor/initialize ping
- [ ] 4.2 Filter `listAgents` handler to return only healthy agents

## 5. Handlers and coordinator

- [ ] 5.1 Add `bindAgent` controller handler
- [ ] 5.2 Update catalog handlers to require `threadId` and use bound session
- [ ] 5.3 Reject `chat` when thread has no `sessionId` (must bind first)

## 6. Client integration (PR #49 composer)

- [ ] 6.1 Update `useAgentCatalog` to call `bindAgent` on agent select; extend `modelsLoading` to include bind-in-flight
- [ ] 6.2 Wire bind into `apps/web/src/components/chat/composer/agent-model-picker.tsx` agent column
- [ ] 6.3 Auto-bind on thread open when `agentName` persisted but session not in memory
- [ ] 6.4 Disable agent column in picker when `agentLocked`; show lock state in `footer-controls.tsx` if needed
- [ ] 6.5 Persist agent selection to DB via bind (remove Zustand-only agent source of truth)

## 7. Tests

- [ ] 7.1 Unit tests: bind, switch, lock, delete cleanup in `AgentRuntime`
- [ ] 7.2 Integration test: bind → catalog → prompt reuses same sessionId
- [ ] 7.3 Integration test: listAgents omits unhealthy agent
