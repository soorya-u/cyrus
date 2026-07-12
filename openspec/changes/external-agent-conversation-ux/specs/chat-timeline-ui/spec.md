## ADDED Requirements

### Requirement: Error feed entry in flat timeline

The web chat timeline SHALL support a flat `error` feed entry type rendered alongside messages, tools, and diffs. Error entries SHALL be produced by `deriveFeed` from persisted thread error events.

#### Scenario: Error renders in feed

- **WHEN** a thread contains a persisted `thread_error` event for a turn
- **THEN** `deriveFeed` emits a `FeedEntry` with `type: "error"`
- **AND** `FeedEntryView` renders an inline error card for that entry

#### Scenario: Error does not use WorkLog bundling

- **WHEN** an error occurs during a turn that also has tool activity
- **THEN** the error appears as its own flat feed entry
- **AND** is not nested inside a collapsible work-log group
