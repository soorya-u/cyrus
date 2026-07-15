## Why

Cyrus still auto-allows all ACP permission requests via `createDefaultHost()`, and has no elicitation handling. Both gaps live on the same ACP host surface: mid-turn callbacks that must block, emit events, await a user response over P2P, and resume the agent. Shipping them separately would rewrite `host.ts`, pending maps, feed types, and respond RPCs twice. External agents need interactive allow/deny (including diff review) and form/url elicitation (MCP prompts, AskUserQuestion) before multi-step workflows are usable.

## What Changes

- Replace auto-allow host with a shared blocking pending-registry host for both `requestPermission` and elicitation callbacks
- Emit and persist `approval_request` and `elicitation_request` events during turns
- Add `respondApproval` and `respondElicitation` RPCs (any connected UI device may respond)
- Build flat feed rows (`ApprovalRow`, `ElicitationRow`) mirroring `error-row.tsx`
- Wire diff/tool accept/reject through `respondApproval`; gate elicitation UI on bind capabilities

Merges former changes `acp-interactive-permissions` and `acp-elicitation` (GitHub #47 / #48).

## Capabilities

### New Capabilities

- `acp-interactive-host`: Blocking ACP host, pending registry, approval + elicitation events/RPCs, and feed UI

### Modified Capabilities

- `acp-session-router`: Prompt turn may pause until approval or elicitation resolved
- `wire-schemas`: `respondApproval` / `respondElicitation` contracts; event schemas
- `conversation-view`: Approval and elicitation entries in folded feed
- `chat-timeline-ui`: `approval` and `elicitation` `FeedEntry` types in flat timeline

## Non-goals

- Agent auth/login
- Approval policy engine / remember rules beyond ACP option kinds
- Sandbox escalation meta (defer unless agents require it)
- Custom elicitation beyond ACP form + url modes
- Deferring draft `session/new` ([#55](https://github.com/soorya-u/cyrus/issues/55) — orthogonal)

## Prerequisites

- Merged [#51](https://github.com/soorya-u/cyrus/pull/51): thread-bound sessions, `@cyrus/errors`
- Merged [#49](https://github.com/soorya-u/cyrus/pull/49) / [#52](https://github.com/soorya-u/cyrus/pull/52): flat feed `DiffRow`/`ToolRow`; git `diff-panel` is **not** the permission target
- Merged [#54](https://github.com/soorya-u/cyrus/pull/54) / [#56](https://github.com/soorya-u/cyrus/pull/56): bind capabilities cache, `ErrorRow` / `error` `FeedEntry` pattern, disposable draft sessions

## Impact

- `apps/cli`: `host.ts`, pending registry, `runTurn`, respond handlers; persist via `thread_error` path (#56)
- `apps/web`, `apps/mobile`: `feed-entry-view.tsx`, `work-log/diff-row.tsx`, `work-log/tool-row.tsx`, new `ApprovalRow` / `ElicitationRow`
- `shared/schemas`, `shared/hooks`, `shared/utils`: events, fold, `deriveFeed`
- Modified specs: `conversation-view`, `chat-timeline-ui`, `wire-schemas`, `acp-session-router`
