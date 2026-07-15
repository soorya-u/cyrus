## ADDED Requirements

### Requirement: Approval feed entry in flat timeline

The web chat timeline SHALL support flat approval feed entries produced by `deriveFeed` from persisted `approval_request` events. Approval entries SHALL render alongside tools and diffs without WorkLog bundling.

#### Scenario: Approval renders in feed

- **WHEN** a turn contains a persisted `approval_request` event
- **THEN** `deriveFeed` emits a `FeedEntry` with `type: "approval"`
- **AND** `FeedEntryView` renders option buttons for allow/deny actions

#### Scenario: Diff approval actions on DiffRow

- **WHEN** a pending approval references a diff-producing tool call
- **THEN** `work-log/diff-row.tsx` shows accept/reject controls wired to `respondApproval`
- **AND** the diff row remains a flat feed entry (not nested in a collapsible group)
- **AND** is not confused with git worktree diffs in `diff-panel.tsx`

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
