## 1. Shared host + pending registry

- [x] 1.1 Implement shared pending registry (permission + elicitation entries with promise resolvers)
- [x] 1.2 Replace auto-allow in `createDefaultHost` with blocking `requestPermission`
- [x] 1.3 Add elicitation callback on the same host
- [x] 1.4 Clear all pending for a thread on turn cancel (deny / decline)

## 2. Wire schemas and RPC

- [x] 2.1 Add `approval_request` / `elicitation_request` event schemas and respond input schemas
- [x] 2.2 Add `respondApproval` and `respondElicitation` to controller contract + handlers
- [x] 2.3 Wire await into `AgentRuntime.prompt` / `runTurn`; persist events like `thread_error`
- [x] 2.4 Validate respond targets pending request on the correct thread

## 3. View layer and feed types

- [x] 3.1 Extend `fold()` and view schemas for approval + elicitation entries
- [x] 3.2 Add `approval` and `elicitation` variants to `FeedEntry` in `thread-feed.ts`

## 4. Web and mobile UI

- [x] 4.1 Build `ApprovalRow` (mirror `error-row.tsx`) and wire in `feed-entry-view.tsx`
- [x] 4.2 Wire `work-log/diff-row.tsx` / `tool-row.tsx` accept/reject to `respondApproval`
- [x] 4.3 Build `ElicitationRow` (form + url modes) and wire in `feed-entry-view.tsx`
- [x] 4.4 Gate elicitation UI on bind capabilities
- [x] 4.5 Port both rows to mobile feed _(N/A — mobile has no chat feed yet; web-only)_
- [x] 4.6 Show pending state for observers via conversation snapshot

## 5. Specs

- [x] 5.1 Delta-update `chat-timeline-ui`, `conversation-view`, `wire-schemas` for both entry types

## 6. Tests

- [x] 6.1 Host blocks until `respondApproval` resolves; cancel denies pending
- [x] 6.2 Elicitation blocks until respond; decline completes elicitation
- [x] 6.3 Events persisted, folded, and derived into flat feed entries
