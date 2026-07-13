## Context

Phase 1 (#51) delivers thread-bound sessions with persisted `sessionId`. PR #52 added optimistic bind, resume rebind on stale sessions, and composer-level agent loading/error UI — but bind/resume/prompt failures are still not persisted as `thread_error` events or shown in the feed. Thread titles still use first-message slice; composer draft is local `useState` only. `thread-header.tsx` now includes git Diffs/init actions alongside the title breadcrumb.

## Goals / Non-Goals

**Goals:**

- Persisted + streamed error events visible in thread UI
- Catalog invalidates dependent options when model changes
- Client-only draft composer persistence (Zustand persist)
- Auto thread titles after first turn; accept agent-pushed titles when ACP sends them

**Non-Goals:**

- Full interactive permissions for all tool types (`acp-interactive-permissions`)
- Edit/resubmit messages, notifications, token usage display
- Server-side composer storage
- `listSessions`
- Git worktree diff panel (`git-diff-panel` spec) — separate from agent tool diffs in feed

## Decisions

### 1. Error surfacing (items 5, 13)

**Choice:** New wire event `thread_error` (or reuse `session_update` with `session.error` normalized) persisted like other turn events.

Emit on: bindAgent failure, resume failure, prompt exception, agent subprocess crash mid-turn.

UI: new `error` `FeedEntry` type rendered in `feed-entry-view.tsx` (same pattern as `tool`/`diff`) + composer disabled/warning state in `composer/index.tsx` when thread cannot accept input. Complements (does not replace) PR #52 agent-load and bind optimistic error handling in `use-agent-catalog.ts`.

**Not** a global agent health panel — unhealthy agents never appear in `listAgents`.

### 2. Catalog refresh on model change (item 6)

After `setModel` succeeds, invalidate `getEfforts` / `getPersona` query keys for that thread in `use-agent-catalog.ts`. Worker re-reads config options from bound session.

If effort selection becomes invalid, reset to first valid option or session default.

### 3. Draft composer persistence (item 8)

Extend `useComposerDraftStore` with `zustand/middleware/persist`. Wire into `composer/index.tsx` textarea (replaces local `useState` for draft text). Storage key: `cyrus-composer-drafts`. Clear on successful send.

### 4. Thread title auto-gen (item 9)

**How Zed does it:** Zed Agent uses an LLM call to summarize the thread. External agents may push title via ACP session notifications (`session/update` title fields where supported). Users can manually edit.

**Cyrus approach (two paths):**

1. **Primary (Cyrus-owned):** After first `turn_completed`, worker sets `threads.name` from a title generator: truncate/sanitize first user message, or if assistant response exists use first sentence of assistant text (max 50 chars). Replaces naive `threadNameFromPrompt` only when name is still default `"New thread"`.
2. **Secondary (ACP):** If mapped `session_update` carries session title metadata, update `threads.name` when not manually renamed by user (track `titleSource: auto | agent | user` in metadata or infer from rename RPC).

Manual rename via existing `renameThread` overrides auto titles. Display/update title in `thread-header.tsx` breadcrumb (PR #49).

**Not an ACP requirement** — optional enhancement when agents send title updates.

### 5. Diff review

Moved to `acp-interactive-permissions` — full permission host and diff accept/reject UI live there, not scoped-only in this change.

## Risks / Trade-offs

- **[Risk] Title regen overwrites user intent** → Only auto-title when name is `"New thread"` or `titleSource = auto`
- **[Risk] Composer persist stale across devices** → Acceptable; client-local by design

## Migration Plan

1. Implement after lifecycle change merged
2. Add wire events + fold() support for errors
3. UI components incrementally

## Open Questions

- Title generator: heuristic only for v1, or optional small LLM call later?
- Should `respondApproval` be generic (reused by future full permissions)? **Yes** — design RPC generically, UI scoped to diffs first.
