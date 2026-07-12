## Why

Once draft sessions exist, the conversation UI still lacks external-agent behaviors users expect: visible connection/session failures, catalog that updates when model changes, unsent composer text surviving navigation, meaningful thread titles beyond the first-message slice, and diff review actions that respond to agent permission options. These are client and event-layer gaps that block usable multi-turn agent workflows.

## What Changes

- Surface ACP/session/connection errors as persisted thread events and inline UI states (no separate health dashboard)
- Refresh effort/persona catalog when model changes (re-fetch thread catalog or invalidate dependent options)
- Persist draft composer text per thread in client Zustand + `persist` (web/mobile); no server storage
- Auto-generate thread titles after first completed turn (Cyrus-owned); apply ACP session title notifications when agent sends them

## Capabilities

### New Capabilities

- `thread-error-surfacing`: Connection, session, and turn errors as wire events and feed UI
- `thread-title`: Auto-title generation and optional agent-provided title updates

### Modified Capabilities

- `conversation-view`: Error entries in feed; title display rules
- `chat-timeline-ui`: Error `FeedEntry` type in flat timeline
- `wire-schemas`: Error event types if not covered by existing `session_update` / terminal events

## Non-goals

- Edit/resubmit prior user messages
- Diff accept/reject (see `acp-interactive-permissions`)
- Agent auth, notifications, follow mode, checkpoints
- `listSessions` integration
- Server-side draft composer storage
- Prompt queue, @-mentions, slash commands, elicitation, token usage (future changes)
- Agent health UI (unhealthy agents excluded server-side)

## Prerequisites

Merged in [#49](https://github.com/soorya-u/cyrus/pull/49): flat chat feed via `deriveFeed` (`shared/utils/src/conversations/thread-feed.ts`), `FeedEntryView` rendering `ToolRow`/`DiffRow` per entry (no collapsible `WorkLog`), breadcrumb `thread-header.tsx`, and turn-level `WorkingMarker`. Error/approval/elicitation entries should follow this flat feed pattern.

## Impact

- `apps/web`, `apps/mobile`: `feed-entry-view.tsx`, `thread-header.tsx`, `composer/index.tsx` (draft persist)
- `shared/hooks`: catalog invalidation on model change; composer persist store
- `shared/utils`: extend `deriveFeed` / `FeedEntry` union for error entries
- `apps/cli`: title update handler; error event emission
- Modified specs: `conversation-view`, `chat-timeline-ui` (error feed entries)
- **Depends on** `acp-draft-session-lifecycle`, PR #49 chat timeline UI
