## ADDED Requirements

### Requirement: Git-backed diff side panel

The thread workspace diff side panel SHALL display git working tree changes at the thread's effective cwd. It SHALL NOT use `conversation.diffs` as its data source.

#### Scenario: Panel shows git file list

- **WHEN** the user opens the diff panel on a thread whose project is a git repository
- **THEN** the panel displays the current branch name, aggregate +/- counts, and a list of changed files from `getGitStatus`
- **AND** selecting a file renders its patch via `getGitPatch` and `@pierre/diffs`

#### Scenario: Panel hidden for non-git projects

- **WHEN** `getGitStatus({ threadId }).isRepo` is `false`
- **THEN** the Diffs toggle button is not shown in the thread header

#### Scenario: Empty working tree

- **WHEN** the diff panel is open and there are no changes
- **THEN** the panel displays an empty state indicating no changes (not "No diffs produced yet" from conversation events)

### Requirement: Diff panel refresh triggers

The client SHALL refetch git status when the diff panel opens, when the open thread's turn completes or is interrupted, after a branch checkout succeeds, and when the user clicks Sync.

#### Scenario: Refresh on panel open

- **WHEN** the user toggles the diff panel open
- **THEN** the client fetches fresh `getGitStatus` and `getGitPatch` data

#### Scenario: Refresh on turn completion

- **WHEN** the open thread's latest turn transitions to `complete` or `interrupted`
- **THEN** the client invalidates and refetches git status if the diff panel is open

#### Scenario: Manual sync

- **WHEN** the user clicks the Sync control in the diff panel header
- **THEN** the client refetches git status and the currently selected file patch

### Requirement: Agent diffs remain in chat feed

Per-turn agent-reported diffs (`DiffRow` in the conversation feed) SHALL remain unchanged. The git diff panel is a separate view of repository state.

#### Scenario: Feed still shows tool-call diffs

- **WHEN** an agent tool call emits diff content during a turn
- **THEN** `DiffRow` renders in the chat feed as today
- **AND** the git diff panel independently reflects actual git state
