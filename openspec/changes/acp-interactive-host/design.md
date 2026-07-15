## Context

`createDefaultHost()` in `apps/cli/src/core/acp/host.ts` auto-selects the first allow option. `mapApprovalRequest` exists in `events.ts` but is never called. Elicitation callbacks are unimplemented. Architecture expects P2P response: any observing device answers, owning worker resolves the ACP host promise.

**PR #49/#52:** Flat feed with agent `DiffRow` / `ToolRow`; git `diff-panel.tsx` is separate — do not wire approvals there.

**PR #54/#56:** `ErrorRow` + `error` `FeedEntry` are the template for interactive cards. Bind capabilities are cached. Disposable drafts keep sessions in memory until first chat; permissions and elicitation only arise mid-turn on a live session (#55 is orthogonal).

## Goals / Non-Goals

**Goals:** One blocking ACP host with shared pending registry for permissions and elicitation; stream/persist events; respond RPCs; flat feed UI for both; diff/tool permission actions.

**Non-goals:** Auth, policy engine beyond ACP option kinds, custom elicitation modes, draft session deferral (#55).

## Decisions

### 1. Shared pending registry

In-memory maps on the worker for permission and elicitation waits:

- Permission key: `${sessionId}:${toolCallId}` (or ACP request id)
- Elicitation key: `elicitationId`

Host callback → emit event → await promise until respond RPC or turn cancel.

### 2. Host rewrite

Replace `createDefaultHost` auto-allow with:

- `requestPermission` → emit `approval_request`, await `respondApproval`
- Elicitation callback → emit `elicitation_request`, await `respondElicitation`

Clear all pending for a thread on cancel/stop (deny / decline).

### 3. Respond RPCs

- `respondApproval({ threadId, toolCallId, optionId })` → `PermissionDecision`
- `respondElicitation({ threadId, elicitationId, action, content? })` → complete elicitation

Any peer may call via controller ORPC; first response wins.

### 4. Event persistence

Persist requests as conversation entries (same path as `thread_error`) so mid-turn observers see pending state. Optional resolve events or update via existing tool status updates.

### 5. Diff / tool review

Accept/reject on `work-log/diff-row.tsx` and `work-log/tool-row.tsx` call `respondApproval` when gated. Sibling `approval` feed entry is fine when not tied to a rendered diff.

### 6. Elicitation UI

`ElicitationRow` (mirror `error-row.tsx`): form mode from JSON schema; url mode with confirm/decline. Gate on bind capabilities (#54).

### 7. Turn blocking

`runTurn` / prompt loop awaits pending resolution before continuing for that tool call or elicitation.

## Risks / Trade-offs

- **[Risk] Orphan pending if client disconnects** → cancel turn clears pending with deny/decline
- **[Risk] Multi-device double response** → first wins; ignore subsequent
- **[Risk] Form elicitation sprawl** → keep v1 to ACP form + url only; ship permissions first inside the same PR if forms slip

## Migration Plan

Replace host in AgentPool boot only. Additive wire/view schemas. No DB migration.

## Open Questions

- Timeout default? Defer — wait until user acts or cancel.
