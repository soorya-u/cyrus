## Why

ACP agents (especially Claude-based bridges) use elicitation for MCP form/url prompts and AskUserQuestion flows. Cyrus has no elicitation handling — the worker cannot surface agent questions or return user answers, blocking multi-step agent workflows.

## What Changes

- Handle ACP `session/create_elicitation` (and completion) in the worker host/client bridge
- Emit `elicitation_request` wire events during turns; persist on thread
- Add `respondElicitation` RPC with form field values or url completion
- Render elicitation cards in thread feed (form fields and url mode)
- Gate UI on agent capabilities from bind snapshot

## Capabilities

### New Capabilities

- `acp-elicitation`: Elicitation request events, respond RPC, and client form/url UI

### Modified Capabilities

- `wire-schemas`: Elicitation event and respond schemas
- `conversation-view`: Elicitation entries in folded feed
- `chat-timeline-ui`: Elicitation `FeedEntry` type in flat timeline derivation

## Non-goals

- Agent auth
- Full permission system (see `acp-interactive-permissions`)
- Custom elicitation beyond ACP protocol (form + url modes)

## Prerequisites

Merged in [#49](https://github.com/soorya-u/cyrus/pull/49): flat chat feed via `deriveFeed` and `FeedEntryView` (no collapsible `WorkLog`). Elicitation cards follow the same flat feed-entry pattern as tools, diffs, and errors.

## Impact

- `apps/cli`: elicitation handler in ACP host, pending map, respond handler
- `apps/web`, `apps/mobile`: `feed-entry-view.tsx`, new elicitation card component
- `shared/utils`: extend `deriveFeed` / `FeedEntry` for elicitation entries
- Modified specs: `conversation-view`, `chat-timeline-ui` (elicitation feed entries)
- Depends on: `acp-draft-session-lifecycle`, PR #49 chat timeline UI; recommended after `acp-interactive-permissions` (similar blocking pattern)
