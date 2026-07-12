## MODIFIED Requirements

### Requirement: Presentation layout stays client-side

The system SHALL keep `FeedEntry` and `useThreadFeed` in `@cyrus/hooks` as React-shared presentation logic. `FeedEntry` SHALL NOT be part of wire or view schemas and SHALL NOT be returned by ORPC endpoints. Feed entries SHALL include flat `tool` and `diff` types in addition to `message`, `thought`, `loading`, and `turn-fold`. The `work` grouped entry type and `WorkLog` wrapper SHALL be removed from the presentation layer.

#### Scenario: Feed derives from folded conversation

- **WHEN** `useThreadFeed` is called with a folded `ThreadConversation`
- **THEN** it produces a `FeedEntry[]` layout suitable for chat scroll rendering
- **AND** the feed layout logic is shared between web and React Native via `@cyrus/hooks`

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
- **AND** `deriveFeed` may omit the `loading` entry type in favor of turn-state-driven UI
