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

- Merged [#51](https://github.com/soorya-u/cyrus/pull/51): thread-bound sessions and `@cyrus/errors` coordinator tags.
- Merged [#49](https://github.com/soorya-u/cyrus/pull/49): flat `FeedEntryView` with agent `DiffRow` in `work-log/diff-row.tsx` (tool output diffs).
- Merged [#52](https://github.com/soorya-u/cyrus/pull/52): git `diff-panel.tsx` for worktree diffs — **not** the target for agent permission accept/reject (that is feed `DiffRow`).

## Impact

- `apps/cli`: `host.ts`, `runTurn`, approval pending map, `respondApproval` handler
- `apps/web`, `apps/mobile`: `feed-entry-view.tsx`, `work-log/diff-row.tsx`, `work-log/tool-row.tsx`, new `ApprovalCard` (or inline approval entry)
- `shared/schemas`, `shared/hooks`: approval state, respond mutation
- `shared/utils`: extend `deriveFeed` / `FeedEntry` for approval entries
- Modified specs: `conversation-view`, `chat-timeline-ui` (approval feed entries)
- Depends on: Phase 1 (#51), PR #49 feed UI; recommended after Phase 2
