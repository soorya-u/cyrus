## 1. View schemas in @cyrus/connections

- [x] 1.1 Create `shared/connections/src/schemas/rtc/view.ts` with `MessageViewSchema`, `ToolCallViewSchema`, `DiffViewSchema`, `TurnViewSchema`, `ThreadConversationSchema` using wire/ACP field names
- [x] 1.2 Export `z.infer` types for all view schemas from the module

## 2. fold() in @cyrus/utils

- [x] 2.1 Add `@cyrus/connections` dependency to `shared/utils/package.json`
- [x] 2.2 Move `derive-thread.ts` logic to `shared/utils/src/fold.ts`, rename export to `fold`, validate output with `ThreadConversationSchema.parse()`
- [x] 2.3 Add unit tests for `fold()` covering messages, tool calls, diffs, and turn state inference

## 3. Slim down @cyrus/hooks

- [x] 3.1 Delete `shared/hooks/src/types.ts` and `shared/hooks/src/derive-thread.ts`
- [x] 3.2 Update `use-thread-feed.ts` to import view types from `@cyrus/connections` and define `FeedEntry` locally
- [x] 3.3 Add `@cyrus/connections` to `shared/hooks/package.json` dependencies if not already present

## 4. Web — remove mapping layer

- [x] 4.1 Delete `apps/web/src/utils/map-controller.ts`
- [x] 4.2 Update `use-projects.ts` and `use-threads.ts` to use wire `Project`/`Thread` types directly from `@cyrus/connections`
- [x] 4.3 Update `use-thread-conversation.ts` to call `fold()` from `@cyrus/utils/fold` and return `ThreadConversation` (no fake `status` field)

## 5. Web — component migration

- [x] 5.1 Update sidebar components (`project-thread-group`, `project-thread-explorer`, `thread-row`) for wire names (`name`, `cwd`, `agentName`, `updatedAt`); remove `branch` pill and `latestUserMessageAt`
- [x] 5.2 Update chat components (`chat-feed`, `feed-entry-view`, messages, work-log, diff-panel, thread-header`) for view schema field names (`toolCallId`, `title`, `rawInput`, `rawOutput`)
- [x] 5.3 Update `thread-workspace.tsx` to merge `ThreadSchema` metadata + `ThreadConversation` from hook; derive composer busy from folded turn state

## 6. Web — cleanup client state

- [x] 6.1 Remove `streamingThreadIds` / `setThreadStreaming` from `chat-ui` store and `use-controller-threads.ts`
- [x] 6.2 Remove `ThreadStatus` usage from `thread-row` (neutral display until CLI status follow-up, or derive from open thread only)

## 7. Verification

- [x] 7.1 Run `bun check:types` across monorepo
- [x] 7.2 Run `bun check` (Biome) and fix any lint issues
- [x] 7.3 Smoke test: project list, thread list, open thread, send message, tool call rendering, feed layout
