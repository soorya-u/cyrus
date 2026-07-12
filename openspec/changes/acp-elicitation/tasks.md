## 1. Wire schemas

- [ ] 1.1 Add `ElicitationRequestEventSchema` and respond input schemas
- [ ] 1.2 Extend `fold()` and view schemas for elicitation entries
- [ ] 1.3 Add `elicitation` variant to `FeedEntry` in `shared/utils/src/conversations/thread-feed.ts`

## 2. Worker

- [ ] 2.1 Implement elicitation callback in ACP host with pending registry
- [ ] 2.2 Add `respondElicitation` controller handler
- [ ] 2.3 Persist elicitation_request events during turns
- [ ] 2.4 Clear pending on turn cancel

## 3. UI (PR #49 feed)

- [ ] 3.1 Build form elicitation card rendered in `feed-entry-view.tsx`
- [ ] 3.2 Build URL elicitation card in same flat feed-entry pattern
- [ ] 3.3 Gate on capabilities from bind snapshot

## 4. Specs

- [ ] 4.1 Delta-update `chat-timeline-ui` spec for elicitation feed entries

## 5. Tests

- [ ] 5.1 Elicitation blocks until respond
- [ ] 5.2 Decline path completes elicitation
- [ ] 5.3 Elicitation event derived into flat feed entry
