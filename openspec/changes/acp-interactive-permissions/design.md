## Context

`createDefaultHost()` in `apps/cli/src/core/acp/host.ts` auto-selects first allow option. `mapApprovalRequest` exists in `events.ts` but is never called from `AgentRuntime.prompt()`. Architecture doc and plan 09 describe P2P approval — any observing device responds, owner worker resolves ACP host promise.

**PR #49 context (merged):** Web timeline uses flat `FeedEntryView` with agent `DiffRow` (`apps/web/src/components/chat/work-log/diff-row.tsx`) and `ToolRow` per entry.

**PR #52 context (merged):** Git worktree diffs live in `diff-panel.tsx` / `thread-header` Diffs toggle — separate from agent permission diffs in the feed. Do not wire `respondApproval` to the git diff panel.

## Goals / Non-Goals

**Goals:** Block on permission requests, stream approval events, respondApproval RPC, full UI for all tool types (not diff-only).

**Non-goals:** Elicitation, auth, policy engine beyond ACP option kinds.

## Decisions

### 1. Pending permission registry

In-memory `Map<requestKey, { resolve, request, threadId, turnId }>` on worker. Key = `${sessionId}:${toolCallId}` or ACP request id if provided.

Host `requestPermission` → emit event → await promise with timeout (configurable, default none/infinite until cancel).

### 2. respondApproval RPC

Input: `{ threadId, toolCallId, optionId }`. Validates pending exists for thread, calls resolve with mapped `PermissionDecision`.

Any peer may call via controller ORPC; worker validates thread ownership on local worker only (remote UI sends to owning worker via WebRTC — existing RTC path).

### 3. Event persistence

Emit `approval_request` before blocking. On response, emit `approval_resolved` optional or update tool call status via existing tool update events.

Persist approval_request so observers joining mid-turn see pending state.

### 4. Diff review

Diff accept/reject in `work-log/diff-row.tsx` uses same `respondApproval` — add action buttons when a pending `approval_request` references the diff's tool call. Tool permissions render inline on `work-log/tool-row.tsx` or as a sibling `approval` feed entry.

### 5. Turn blocking

`runTurn` async generator awaits permission resolution before continuing event stream consumption for that tool call.

## Risks / Trade-offs

- **[Risk] Orphan pending if client disconnects** → cancel turn clears pending with deny; thread stop resolves all pending as deny
- **[Risk] Multi-device double response** → first response wins; ignore subsequent

## Migration Plan

Replace host in AgentPool boot only. No DB migration.

## Open Questions

- Timeout default? Defer — wait until user acts or cancel.
