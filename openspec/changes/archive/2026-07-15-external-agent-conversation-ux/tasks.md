## 1. Wire events and feed types

- [x] 1.1 Add `ThreadErrorEventSchema` to `@cyrus/schemas/rtc/chat` and `AgentEvent` union
- [x] 1.2 Extend `fold()` and view schemas for error entries
- [x] 1.3 Add `error` variant to `FeedEntry` in `shared/utils/src/conversations/thread-feed.ts`

## 2. Worker: errors and titles

- [x] 2.1 Emit and persist `thread_error` on bind/resume/prompt failures
- [x] 2.2 Implement auto-title update after first `turn_completed` (default name only)
- [x] 2.3 Map ACP session title notifications to `threads.name` when not user-renamed
- [x] 2.4 Track title source (auto vs user) or infer from rename RPC

## 3. Worker: catalog refresh

- [x] 3.1 After `setModel`, refresh session config options before returning
- [x] 3.2 Reset invalid effort/persona selection server-side when options change

## 4. Web UI (PR #49/#52 feed + composer)

- [x] 4.1 Add `ErrorRow` (or inline error entry) in `feed-entry-view.tsx`
- [x] 4.2 Add composer warning/disabled state in `composer/index.tsx` on bind/resume/chat error (beyond agent-list load errors)
- [x] 4.3 Invalidate effort/persona queries after model change in `use-agent-catalog.ts` / `compact-composer-controls.tsx`
- [x] 4.4 Add `useComposerDraftStore` with zustand persist; replace composer `useState` draft
- [x] 4.5 Reflect auto-generated titles in `thread-header.tsx` breadcrumb (alongside git actions)

## 5. Mobile UI

- [x] 5.1 Port error feed rendering and composer draft persist

## 6. Specs

- [x] 6.1 Delta-update `chat-timeline-ui` spec for error feed entries

## 7. Tests

- [x] 7.1 Event mapping tests for `thread_error` and `deriveFeed` error entry
- [x] 7.2 Auto-title repository test (default name replaced, manual preserved)
