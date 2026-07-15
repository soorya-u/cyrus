## Purpose

Client-derived conversation view schemas and the platform-agnostic `fold()` pipeline that produces them from the persisted event log.

## Requirements

### Requirement: View schemas for folded conversation data

The system SHALL define Zod view schemas in `@cyrus/schemas/view` for the client-derived conversation shape: `MessageViewSchema`, `ToolCallViewSchema`, `DiffViewSchema`, `TurnViewSchema`, and `ThreadConversationSchema`. TypeScript types SHALL be derived via `z.infer` with no parallel hand-rolled definitions. View schemas SHALL include representations for thread error entries and diff review state where applicable.

#### Scenario: View schemas use wire and ACP field names

- **WHEN** a consumer imports view types from `@cyrus/schemas/view`
- **THEN** tool call fields use `toolCallId` and `title` (not `id` and `name`)
- **AND** project paths use `cwd` from `ProjectSchema` (not a separate `path` alias)

#### Scenario: Error entries fold into conversation view

- **WHEN** `fold()` processes a thread error event
- **THEN** the result includes a renderable error entry associated with the correct turn

### Requirement: Platform-agnostic conversation folding

The system SHALL provide a `fold()` function in `@cyrus/utils` that accepts `ConversationEntry[]` and returns a `ThreadConversation` object validated against `ThreadConversationSchema`.

#### Scenario: Fold produces messages from event log

- **WHEN** `fold()` is called with entries containing `user_message`, `token`, and `message_completed` events for a turn
- **THEN** the result contains `MessageView` entries with accumulated assistant text and correct `turnId` associations

#### Scenario: Fold produces tool calls and diffs

- **WHEN** `fold()` is called with entries containing `tool_call` and `tool_call_update` events with diff content
- **THEN** the result contains `ToolCallView` entries keyed by `toolCallId`
- **AND** flattened `DiffView` entries extracted from tool call content

#### Scenario: Fold infers turn state

- **WHEN** `fold()` is called with entries for multiple turns including a `turn_completed` or `turn_interrupted` event
- **THEN** each `TurnView` has `state` of `complete`, `interrupted`, or `running` based on event sequence
- **AND** the latest turn is marked `running` when in-progress tools or streaming deltas are present

#### Scenario: Fold output is schema-validated

- **WHEN** `fold()` completes processing a valid event log
- **THEN** the return value passes `ThreadConversationSchema.parse()` without error

### Requirement: No client-side wire-to-view rename layer

The system SHALL NOT maintain a separate mapping layer (such as `map-controller.ts`) that renames wire fields to UI aliases. Web and React Native clients SHALL consume `ProjectSchema` and `ThreadSchema` from `@cyrus/schemas/rtc/*`, and view schemas from `@cyrus/schemas/view`.

#### Scenario: Project list uses wire shape

- **WHEN** the web app displays a project from `listProjects`
- **THEN** it uses `project.cwd` and `project.name` without transforming to `path` or other aliases

#### Scenario: Thread list uses wire shape

- **WHEN** the web app displays a thread from `listThreads`
- **THEN** it uses `thread.name` and `thread.agentName` without transforming to `title` or `branch`

### Requirement: Presentation layout stays client-side

The system SHALL keep `FeedEntry` and feed derivation (`deriveFeed`, `getRunningTurn`, `getTurnStartedAt`) in `@cyrus/utils/conversations/thread-feed` as shared presentation logic. `FeedEntry` SHALL NOT be part of wire or view schemas and SHALL NOT be returned by ORPC endpoints. Feed entries SHALL include flat `tool` and `diff` types in addition to `message` and `thought`. The `work` grouped entry type and `WorkLog` wrapper SHALL be removed from the presentation layer.

#### Scenario: Feed derives from folded conversation

- **WHEN** `deriveFeed` is called with a folded `ThreadConversation`
- **THEN** it produces a `FeedEntry[]` layout suitable for chat scroll rendering
- **AND** the feed layout logic is shared between web and React Native via `@cyrus/utils`

#### Scenario: Flat tool entries in feed

- **WHEN** a turn contains tool calls
- **THEN** `deriveFeed` emits one `FeedEntry` per tool call with `type: "tool"`
- **AND** no grouped `work` entry wrapping multiple tools is emitted

#### Scenario: Flat diff entries in feed

- **WHEN** a turn contains diffs
- **THEN** `deriveFeed` emits one `FeedEntry` per diff with `type: "diff"`
- **AND** diffs are not bundled inside tool `work` entries

#### Scenario: Working indicator tied to turn lifecycle

- **WHEN** the active turn has `state === "running"` and no assistant message or thought content exists yet
- **THEN** a `loading` feed entry is still NOT the sole activity indicator — the web UI uses a turn-level working marker instead
- **AND** `deriveFeed` omits the `loading` entry type in favor of turn-state-driven UI

### Requirement: Removed dead UI fields

The system SHALL remove the following from shared client types: `branch`, `latestUserMessageAt`, `model` on thread metadata, and `ThreadStatus` as a persisted or mapped field. Agent model selection SHALL continue to use catalog RPC (`getModels`/`setModel`) and per-thread client store.

#### Scenario: No latestUserMessageAt field

- **WHEN** the sidebar displays a thread timestamp
- **THEN** it uses `thread.updatedAt` from `ThreadSchema`
- **AND** no `latestUserMessageAt` field exists in shared types

### Requirement: Thread conversation merges snapshot and overlay

`useThreadConversation` (`shared/hooks/src/connection/use-thread-conversation.ts`) SHALL derive `ThreadConversation` by merging the `getConversations` snapshot with live overlay entries, then calling `fold()` on the merged `ConversationEntry[]`. The merge SHALL prefer snapshot entries on `seq` collision. The hook SHALL consume RTC via `useRtc()`.

#### Scenario: Merged view includes live tokens

- **WHEN** the snapshot contains a `user_message` for the latest turn
- **AND** the overlay contains `token` deltas for that turn
- **THEN** `useThreadConversation` returns a `ThreadConversation` with partial assistant text visible before `message_completed` is persisted

#### Scenario: Snapshot wins on seq collision

- **WHEN** the snapshot and overlay both contain an entry with `seq` 42
- **THEN** the snapshot entry is used in the merge
- **AND** the overlay duplicate is excluded

#### Scenario: Fold is unchanged

- **WHEN** merged entries are passed to `fold()`
- **THEN** the existing `fold()` implementation in `@cyrus/utils` produces the view without modification to its logic

### Requirement: Catalog refresh on model change

When the user changes model for a bound thread, the client SHALL invalidate and refetch effort and persona catalog queries for that thread. The worker SHALL return updated config options from the bound session after `setModel` completes.

#### Scenario: Effort options refresh

- **WHEN** `setModel` succeeds for a thread
- **THEN** the client refetches `getEfforts` and `getPersonas` for that thread
- **AND** invalid prior selections reset to a valid default

### Requirement: Draft composer client persistence

The web and mobile clients SHALL persist the unsent structured composer `ChatMessage` per thread (text and resource/attachment blocks) using client-side storage (Zustand persist). Drafts SHALL survive navigation and app reload on the same device.

#### Scenario: Draft restored on return

- **WHEN** the user navigates away from a thread with an unsent structured composer message and returns
- **THEN** the composer is restored to that exact `ChatMessage` (including resource blocks)

#### Scenario: Draft cleared on send

- **WHEN** the user successfully sends a message
- **THEN** the persisted structured draft for that thread is cleared
