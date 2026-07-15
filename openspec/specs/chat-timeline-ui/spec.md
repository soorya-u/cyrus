## Purpose

Web chat timeline presentation: working markers, flat tool/diff rows, MessageScroller, and shadcn message primitives.

## Requirements

### Requirement: Working marker during active turns

The web chat timeline SHALL display a shadcn `Marker` with shimmer text showing elapsed time ("Working for {n}s") while any turn in the visible conversation has `state === "running"`. The marker SHALL use `role="status"` for assistive technology.

#### Scenario: Working marker visible during running turn

- **WHEN** the user is viewing a thread with a turn in `running` state
- **THEN** a working marker with shimmer is displayed at the bottom of the feed
- **AND** the elapsed time updates without full-list re-renders

#### Scenario: Working marker hidden when turn completes

- **WHEN** all turns in the conversation are `complete` or `interrupted`
- **THEN** the working marker is not displayed

### Requirement: Thinking content is separate from working status

The web chat SHALL render agent reasoning in a collapsible "Thinking" section distinct from the working marker. The thinking section SHALL NOT display a loading spinner on its trigger label.

#### Scenario: Thinking shown while reasoning streams

- **WHEN** a `ThoughtView` entry has non-empty content for the active turn
- **THEN** a collapsible thinking section displays the reasoning text
- **AND** the working marker remains the sole turn-level activity indicator

### Requirement: Flat tool and diff rows

The web chat feed SHALL render each tool call and diff as an individual timeline row without a parent `WorkLog` group header or "Turn activity · N tools · M diffs" summary.

#### Scenario: Tool rows render flat in timeline

- **WHEN** a turn contains multiple tool calls
- **THEN** each tool call appears as its own row in chronological order
- **AND** no collapsible group wrapper encloses them

#### Scenario: Diff rows render as siblings

- **WHEN** a turn contains file diffs
- **THEN** each diff appears as its own collapsible row interleaved with tool and message entries by timestamp

### Requirement: Tool rows use human-readable previews

Each tool row SHALL display a title and optional preview derived from `kind`, `title`, `rawInput`, and `rawOutput`. Rows SHALL NOT expand to show raw JSON input/output blocks.

#### Scenario: Parseable tool shows preview

- **WHEN** a tool call has extractable command, path, or query fields
- **THEN** the row header shows a human-readable preview alongside the title
- **AND** expanding the row shows formatted detail (command output, paths)

#### Scenario: Unparseable tool is non-expandable

- **WHEN** a tool call has no extractable preview or detail
- **THEN** the row displays title and status only
- **AND** no expand affordance is shown

### Requirement: MessageScroller for feed scrolling

The chat feed SHALL use shadcn `MessageScroller` with `MessageScrollerItem` wrapping each feed entry. The feed SHALL support auto-follow during streaming, jump-to-latest when the user scrolls up, and open-at-bottom when landing on an existing thread.

#### Scenario: Auto-follow during streaming

- **WHEN** the user is pinned to the bottom and new content streams in
- **THEN** the viewport follows the latest content automatically

#### Scenario: Jump to latest control

- **WHEN** the user scrolls away from the bottom during an active turn
- **THEN** a scroll-to-end button is available to return to the latest content

### Requirement: Message and Bubble for chat messages

User and assistant messages SHALL render using shadcn `Message` and `Bubble` components instead of hand-rolled styled divs.

#### Scenario: User message alignment and variant

- **WHEN** a user message is rendered
- **THEN** it uses `Message` with end alignment and `Bubble variant="default"`

#### Scenario: Assistant message uses ghost variant

- **WHEN** an assistant message is rendered
- **THEN** it uses `Message` with start alignment and `Bubble variant="ghost"` for full-width prose

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
