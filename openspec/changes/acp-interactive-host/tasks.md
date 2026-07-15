## 1. Shared host + pending registry

- [ ] 1.1 Implement shared pending registry (permission + elicitation entries with promise resolvers)
- [ ] 1.2 Replace auto-allow in `createDefaultHost` with blocking `requestPermission`
- [ ] 1.3 Add elicitation callback on the same host
- [ ] 1.4 Clear all pending for a thread on turn cancel (deny / decline)

## 2. Wire schemas and RPC

- [ ] 2.1 Add `approval_request` / `elicitation_request` event schemas and respond input schemas
- [ ] 2.2 Add `respondApproval` and `respondElicitation` to controller contract + handlers
- [ ] 2.3 Wire await into `AgentRuntime.prompt` / `runTurn`; persist events like `thread_error`
- [ ] 2.4 Validate respond targets pending request on the correct thread

## 3. View layer and feed types

- [ ] 3.1 Extend `fold()` and view schemas for approval + elicitation entries
- [ ] 3.2 Add `approval` and `elicitation` variants to `FeedEntry` in `thread-feed.ts`

## 4. Web and mobile UI

- [ ] 4.1 Build `ApprovalRow` (mirror `error-row.tsx`) and wire in `feed-entry-view.tsx`
- [ ] 4.2 Wire `work-log/diff-row.tsx` / `tool-row.tsx` accept/reject to `respondApproval`
- [ ] 4.3 Build `ElicitationRow` (form + url modes) and wire in `feed-entry-view.tsx`
- [ ] 4.4 Gate elicitation UI on bind capabilities
- [ ] 4.5 Port both rows to mobile feed
- [ ] 4.6 Show pending state for observers via conversation snapshot

## 5. Specs

- [ ] 5.1 Delta-update `chat-timeline-ui`, `conversation-view`, `wire-schemas` for both entry types

## 6. Tests

- [ ] 6.1 Host blocks until `respondApproval` resolves; cancel denies pending
- [ ] 6.2 Elicitation blocks until respond; decline completes elicitation
- [ ] 6.3 Events persisted, folded, and derived into flat feed entries
