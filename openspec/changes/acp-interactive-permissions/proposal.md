## Why

Cyrus auto-allows all ACP permission requests via `createDefaultHost()`, so tool calls never wait for user consent. Wire types for `approval_request` exist but are not emitted or answerable. External agents require interactive allow/deny (including diff review, bash, and other gated tools) with responses routed back to the owning worker.

## What Changes

- Replace auto-allow host with blocking permission handler keyed by pending request id
- Emit `approval_request` events during chat turns; persist like other turn events
- Add `respondApproval` RPC; any connected UI device may respond (P2P via existing event bus)
- Build approval UI cards in thread feed (allow once, allow always, deny)
- Wire diff accept/reject through the same permission path (supersedes scoped-only handler in `external-agent-conversation-ux` design)

## Capabilities

### New Capabilities

- `acp-interactive-permissions`: Blocking permission host, approval events, respondApproval RPC, and client approval UI

### Modified Capabilities

- `acp-session-router`: Prompt turn may pause until approval resolved
- `wire-schemas`: `respondApproval` contract (if not already added by conversation-ux)
- `conversation-view`: Approval request entries in folded feed
- `chat-timeline-ui`: Approval `FeedEntry` type in flat timeline derivation

## Non-goals

- Agent auth/login
- Elicitation forms (separate `acp-elicitation` change)
- Sandbox escalation meta (defer unless agents require it)
- Approval policies / remember rules beyond ACP option kinds

## Prerequisites

Merged in [#49](https://github.com/soorya-u/cyrus/pull/49): flat chat feed via `deriveFeed` and `FeedEntryView` with per-entry `ToolRow` and `DiffRow` (no collapsible `WorkLog`). Approval UI and diff accept/reject wire into `diff-row.tsx` / `tool-row.tsx` as flat feed entries.

## Impact

- `apps/cli`: `host.ts`, `runTurn`, approval pending map, `respondApproval` handler
- `apps/web`, `apps/mobile`: `feed-entry-view.tsx`, `diff-row.tsx`, `tool-row.tsx`, new `ApprovalCard` (or inline approval entry)
- `shared/schemas`, `shared/hooks`: approval state, respond mutation
- `shared/utils`: extend `deriveFeed` / `FeedEntry` for approval entries
- Modified specs: `conversation-view`, `chat-timeline-ui` (approval feed entries)
- Depends on: `acp-draft-session-lifecycle`, PR #49 chat timeline UI
