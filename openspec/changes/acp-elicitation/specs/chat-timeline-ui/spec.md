## ADDED Requirements

### Requirement: Elicitation feed entry in flat timeline

The web chat timeline SHALL support flat elicitation feed entries produced by `deriveFeed` from persisted `elicitation_request` events.

#### Scenario: Form elicitation in feed

- **WHEN** a turn contains a persisted form-mode `elicitation_request` event
- **THEN** `deriveFeed` emits a `FeedEntry` with `type: "elicitation"`
- **AND** `FeedEntryView` renders dynamic form fields with submit/decline actions

#### Scenario: URL elicitation in feed

- **WHEN** a turn contains a persisted url-mode `elicitation_request` event
- **THEN** `FeedEntryView` renders the URL with confirm/decline actions
- **AND** the entry is not nested inside a collapsible work-log group
