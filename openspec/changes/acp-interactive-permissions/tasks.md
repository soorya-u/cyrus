## 1. Worker permission host

- [ ] 1.1 Implement pending permission registry with promise resolver per tool call
- [ ] 1.2 Replace auto-allow in `createDefaultHost` with blocking `requestPermission`
- [ ] 1.3 Emit and persist `approval_request` from host before await
- [ ] 1.4 Clear pending on turn cancel with deny outcome

## 2. RPC and wiring

- [ ] 2.1 Add `respondApproval` schema and controller handler
- [ ] 2.2 Integrate permission await into `AgentRuntime.prompt` / `runTurn` event loop
- [ ] 2.3 Validate respond targets pending request on correct thread

## 3. View layer and feed types

- [ ] 3.1 Extend `fold()` for approval request view entries
- [ ] 3.2 Add `ApprovalRequestViewSchema` if needed in `@cyrus/schemas/view`
- [ ] 3.3 Add `approval` variant to `FeedEntry` in `shared/utils/src/conversations/thread-feed.ts`

## 4. Web and mobile UI (PR #49 feed)

- [ ] 4.1 Build `ApprovalCard` (or `ApprovalRow`) rendered in `feed-entry-view.tsx`
- [ ] 4.2 Wire `diff-row.tsx` accept/reject to `respondApproval` when diff is gated
- [ ] 4.3 Wire `tool-row.tsx` permission actions for non-diff tool approvals
- [ ] 4.4 Show pending approval for observers via conversation snapshot

## 5. Specs

- [ ] 5.1 Delta-update `chat-timeline-ui` spec for approval feed entries

## 6. Tests

- [ ] 6.1 Host blocks until respondApproval resolves
- [ ] 6.2 Cancel turn denies pending permission
- [ ] 6.3 Approval event persisted, folded, and derived into feed entry
