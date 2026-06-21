# Plan: Seed Thread UI from t3code (06)

**Depends on**: 04-05

## Goal
Bring in battle-tested thread/chat UI patterns from t3code so Cyrus feels like a real coding agent app from day 1.

## Sources (copy/adapt, don't vendor blindly)
- apps/web/src/components/chat/* (Composer, MessagesTimeline, ChatHeader, etc.)
- apps/web/src/routes/_chat* (thread routes)
- apps/mobile/src/features/threads/* (ThreadFeed, ThreadDetailScreen, ThreadComposer, NewTaskDraftScreen)
- state management: threads.ts, threadReducer etc. (simplify for our metadata first)
- contracts for ThreadId etc. (define minimal in cyrus)

## Adaptation Strategy
1. Start with **list + detail skeleton** using our metadata (Thread type from plan 05).
2. Use shadcn/ui + existing @cyrus/ui for web.
3. For mobile: match homeland mobile stack (expo, heroui or tailwind, gesture, keyboard).
4. Composer: simple textarea + send that emits PromptRequest (later via WebRTC or rpc to owner worker).
5. Timeline: render AssistantMessage, Token (streaming), ToolCall/Result placeholders.
6. No git/file tree yet – stub.
7. Keep it agent-agnostic (show agent/model in header).

## Web Thread Pages (TanStack Router)
- /threads (list, create)
- /threads/$threadId (detail + live feed)
- Sidebar with workers/agents available.

## Mobile
- Drawer/tabs → Threads list → Thread detail.
- Composer at bottom.
- Use LegendList or FlatList for feed (copy performance patterns).

## State (Phase 1)
- TanStack Query for metadata (list, get).
- Local state or small store for live events (later WebRTC).
- Optimistic title updates, etc.

## Later (Phase 2+)
- Real streaming via P2P events.
- Diffs, approvals, file tree.
- Multi-device observe (presence indicators).

## Files to Create/Adapt (web)
- components/threads/ThreadList.tsx
- components/threads/ThreadDetail.tsx
- components/threads/ThreadComposer.tsx (simple)
- routes/threads/...

## Mobile equivalents under app/threads or features/.

## Do NOT
- Copy t3code's full effect-acp or codex server yet.
- Pull in their entire state machine if too coupled.
- Assume their backend contracts.

## Success
- User can create thread (metadata), see it in list on web + mobile.
- Open detail shows empty feed + composer.
- "Send" logs intent (no real execution yet).
- Header shows owner worker / agent.
