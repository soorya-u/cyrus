## Context

Cyrus stores conversations as an append-only `ConversationEntry[]` event log (wire schema in `@cyrus/connections`, persisted via Turso in `@cyrus/database`). Clients currently fold this log into a renderable shape using hand-rolled types in `@cyrus/hooks/types.ts` and `derive-thread.ts`, with an additional rename layer in `apps/web/src/utils/map-controller.ts`.

Wire schemas already exist for `Project`, `Thread`, `ConversationEntry`, and `AgentEvent`. View types (`Message`, `ToolCall`, `GitDiff`, `Turn`) are duplicated with different field names and no Zod validation. Web and React Native (`apps/mobile`) will both consume folded conversation data; folding must be platform-agnostic to support future offline DB sync.

## Goals / Non-Goals

**Goals:**

- Single source of truth for conversation view types as Zod schemas in `@cyrus/connections`
- Platform-agnostic `fold()` in `@cyrus/utils` that produces validated view shapes from `ConversationEntry[]`
- Eliminate `map-controller.ts` and `hooks/types.ts`
- Use wire/ACP field names end-to-end (`toolCallId`, `title`, `cwd`, `name`)
- Keep `FeedEntry` and `useThreadFeed` in `@cyrus/hooks` as shared React/RN presentation logic
- One PR landing all schema, util, and web migration changes

**Non-Goals:**

- CLI-persisted `Thread.status` (deferred; clients derive open-thread busy state from folded turn state for now)
- New ORPC endpoint for pre-folded views
- `FeedEntry` in wire or view schemas
- Git branch field, `latestUserMessageAt`, `model` on thread metadata

## Decisions

### 1. Two schema layers in `@cyrus/connections`

**Decision:** Keep existing wire schemas unchanged; add a new `schemas/rtc/view.ts` module for view schemas.

**Rationale:** Wire schemas match persistence and ORPC contracts. View schemas describe client-derived aggregates. Mixing them would bloat `ThreadSchema` and confuse what is stored vs computed.

**Alternatives considered:**
- Extend `ThreadSchema` with `messages[]` — rejected; thread list RPC should stay lightweight
- Server-side projection endpoint — rejected; conflicts with offline/sync goal and duplicates CLI work

### 2. View schema field names match wire/ACP

**Decision:** View schemas use `toolCallId`, `title`, `rawInput`, `rawOutput`, `cwd`, `name` — no UI alias layer.

**Rationale:** Eliminates `map-controller.ts` and keeps ACP mapping in `apps/cli/src/core/acp/events.ts` aligned with what UI renders.

**Alternatives considered:**
- UI-friendly aliases (`id`, `name`, `args`) with `.transform()` — rejected per product decision

### 3. `fold()` lives in `@cyrus/utils`

**Decision:** Rename `deriveThreadFromConversation` → `fold`, move to `shared/utils/src/fold.ts`, validate output with `ThreadConversationSchema.parse()`.

**Rationale:** Pure function with no React dependency; reusable from web, RN, and future offline clients. `@cyrus/utils` gains `@cyrus/connections` as a dependency.

**Alternatives considered:**
- Keep in `@cyrus/hooks` — rejected; hooks package should be React-only
- Put in `@cyrus/connections` — rejected; connections is schemas/contracts, not logic

### 4. Split thread metadata from conversation view

**Decision:** UI assembles render state from two sources:
- `ThreadSchema` from `listThreads` / `createThread` (metadata)
- `ThreadConversationSchema` from `fold(getConversations(...))` (messages, tools, diffs, turns)

No fat merged `Thread` type in shared packages.

**Rationale:** Sidebar only needs metadata; open thread view merges at the hook/component layer (`thread-workspace.tsx` pattern).

### 5. `FeedEntry` stays in `@cyrus/hooks`

**Decision:** `deriveFeed` / `useThreadFeed` remain in `@cyrus/hooks`; `FeedEntry` type is defined there, importing view types from `@cyrus/connections`.

**Rationale:** Feed layout is presentation ("work block before message"), not domain. Both web and RN share React and already depend on `@cyrus/hooks`.

### 6. Remove client-side streaming status store

**Decision:** Remove `streamingThreadIds` from `chat-ui` zustand store. Composer busy state derives from `fold()` turn state (`turns.at(-1)?.state === "running"`) for the open thread.

**Rationale:** Zustand state is lost on refresh. Folded turn state is reconstructable from persisted events (modulo non-persisted streaming deltas, which is acceptable until CLI session status lands).

**Alternatives considered:**
- Keep zustand as optimistic overlay — rejected; user wants CLI as session authority long-term

### 7. View schema shapes

**Decision:** Define these schemas in `schemas/rtc/view.ts`:

| Schema | Key fields |
|--------|------------|
| `MessageViewSchema` | `id`, `role`, `content`, `createdAt`, `turnId`, `streaming?` |
| `ToolCallViewSchema` | `toolCallId`, `title`, `kind?`, `status`, `rawInput?`, `rawOutput?`, `createdAt`, `turnId` |
| `DiffViewSchema` | `id`, `path`, `patch`, `additions`, `deletions`, `turnId` |
| `TurnViewSchema` | `id`, `threadId`, `index`, `state`, `completedAt` |
| `ThreadConversationSchema` | `{ messages, toolCalls, diffs, turns }` |

`streaming` on messages is computed by `fold()` for the latest turn, not persisted.

## Risks / Trade-offs

- **[Risk] Sidebar thread status stays inaccurate** → Mitigation: acceptable for this PR; CLI `Thread.status` is explicit follow-up. Remove fake `idle` default and status pill can use neutral state until follow-up.
- **[Risk] Mid-stream refresh loses partial tokens** → Mitigation: pre-existing; streaming deltas are not persisted. `fold()` reflects last persisted `message_completed`. CLI status follow-up will address "is running" separately.
- **[Risk] Large component rename churn** → Mitigation: mechanical field renames; types flow from `z.infer` so compiler guides updates.
- **[Risk] `@cyrus/utils` depends on `@cyrus/connections`** → Mitigation: acceptable; utils already used by database/repos; dependency is one-directional.

## Migration Plan

1. Add view schemas + `fold()` with tests
2. Update `@cyrus/hooks/use-thread-feed.ts` to import view types from connections
3. Delete `types.ts`, `derive-thread.ts`, `map-controller.ts`
4. Update web hooks/components for wire names and split metadata/conversation types
5. Remove zustand streaming state; wire composer busy to folded turn state
6. Run `bun check:types` across monorepo

Rollback: revert single PR; no DB migration required.

## Open Questions

- Should sidebar status pill be removed entirely until CLI status lands, or show a neutral dot based on `updatedAt` only?
- Should `fold()` unit tests live in `shared/utils` or `shared/connections`?
