## Why

Cyrus currently maintains parallel type systems: Zod wire schemas in `@cyrus/connections` and hand-rolled UI types in `@cyrus/hooks/types.ts`, bridged by `map-controller.ts` and `derive-thread.ts`. This drift causes redundant field renaming (`cwd`→`path`, `agentName`→`branch`), stub defaults, and no end-to-end validation of the conversation shape clients render. With Turso persistence landed (#13), we can consolidate view types into `@cyrus/connections` and move event-log folding into platform-agnostic `@cyrus/utils` — preparing web and React Native clients to share the same offline-capable conversation pipeline.

## What Changes

- Add **view schemas** in `@cyrus/connections` (`MessageView`, `ToolCallView`, `DiffView`, `TurnView`, `ThreadConversation`) using wire/ACP field names (`toolCallId`, `title`, `cwd`, etc.)
- Move `derive-thread.ts` → `@cyrus/utils/fold.ts` (single-word, platform-agnostic, validated output)
- Delete `shared/hooks/src/types.ts` and `apps/web/src/utils/map-controller.ts`
- Keep `use-thread-feed.ts` in `@cyrus/hooks` with `FeedEntry` as presentation-only (shared by web + RN)
- Update web components to import wire and view types from `@cyrus/connections` directly
- Remove dead UI fields: `branch`, `latestUserMessageAt`, `model` on Thread, fake `ThreadStatus`
- Remove zustand `streamingThreadIds` usage for thread busy state (derive from folded turn state for open thread)
- **BREAKING**: Web components adopt ACP/wire field names (`toolCallId`, `title`, `name` on threads, `cwd` on projects)

## Capabilities

### New Capabilities

- `conversation-view`: Zod view schemas for folded conversation data and the `fold()` function that derives them from `ConversationEntry[]`

### Modified Capabilities

- (none)

## Non-goals

- CLI-persisted thread `status` on `ThreadSchema` (session authority on CLI) — follow-up issue
- Server-side conversation projection / new ORPC endpoint for pre-folded views
- `FeedEntry` in the wire contract or view schemas (stays as React layout in `@cyrus/hooks`)
- Git branch integration (`branch` field)
- Persisting `modelId` on thread rows (catalog RPC + client store remains)
- `drizzle-orm/zod` codegen from tables

## Impact

- `shared/connections` — new view schema module
- `shared/utils` — new `fold.ts`, add `@cyrus/connections` dependency
- `shared/hooks` — remove `types.ts`, `derive-thread.ts`; keep `use-thread-feed.ts`
- `apps/web` — ~15 components/hooks updated for wire names; delete `map-controller.ts`; simplify `chat-ui` store
- `apps/mobile` — no implementation yet, but `@cyrus/hooks` feed hook becomes the shared layout entry point
- Closes architectural direction for GitHub issue #10
