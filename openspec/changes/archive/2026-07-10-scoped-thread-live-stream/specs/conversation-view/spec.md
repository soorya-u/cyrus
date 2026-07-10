## ADDED Requirements

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
