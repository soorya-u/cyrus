# Git Thread Context

## Purpose

Thread-level git context fields, effective cwd resolution for agent execution, and branch/worktree UX in the web client.

## Requirements

### Requirement: Thread git context fields

`ThreadSchema` and the persisted threads table SHALL include optional nullable fields `branch` and `worktreePath` for git context.

#### Scenario: Thread created without git options

- **WHEN** a thread is created via the default flow
- **THEN** `branch` and `worktreePath` are null or absent
- **AND** existing persisted threads without these fields remain valid

#### Scenario: Thread created on a branch

- **WHEN** a thread is created from the branch picker with a selected ref
- **THEN** `branch` is set to the ref name
- **AND** `worktreePath` remains null unless worktree option was chosen

#### Scenario: Thread created in worktree

- **WHEN** a thread is created with the worktree option for a branch
- **THEN** `worktreePath` is set to the absolute worktree directory
- **AND** `branch` is set to the selected ref name

### Requirement: Effective cwd for agent execution

The CLI `ThreadCoordinator` SHALL resolve agent session cwd as `thread.worktreePath ?? project.cwd`. All agent prompts, catalog RPC, and git operations for a thread SHALL use this effective cwd.

#### Scenario: Default thread uses project cwd

- **WHEN** a thread has no `worktreePath`
- **THEN** the agent session cwd is `project.cwd`

#### Scenario: Worktree thread uses worktree path

- **WHEN** a thread has `worktreePath` set
- **THEN** the agent session cwd is `worktreePath`
- **AND** git status reflects the worktree checkout

### Requirement: Branch indicator in thread header

The thread header SHALL display the current git ref from `getGitStatus` when the project is a git repository.

#### Scenario: Branch name visible

- **WHEN** the user views a thread in a git repository
- **THEN** the thread header shows the current branch name (e.g. `main`, `feature/foo`)

### Requirement: Branch picker and checkout

The web client SHALL provide a branch picker in the thread header (or adjacent control) that lists local refs and supports checkout at the thread's effective cwd.

#### Scenario: Switch branch

- **WHEN** the user selects a different branch from the picker
- **THEN** the client calls `checkoutGitRef({ threadId, refName })`
- **AND** refreshes git status and the diff panel on success
- **AND** displays an error message on failure

#### Scenario: Non-git project

- **WHEN** the project is not a git repository
- **THEN** branch picker controls are not shown

### Requirement: Branch-aware thread creation

The sidebar thread creation flow SHALL support optional branch and worktree selection for git projects via a context menu on "+ New thread".

#### Scenario: Default click unchanged

- **WHEN** the user left-clicks "+ New thread"
- **THEN** a thread is created immediately with null git context fields (current behavior)

#### Scenario: Context menu lists branches

- **WHEN** the user opens the context menu on "+ New thread" for a git project
- **THEN** the menu lists local branches from `listGitRefs` for the project
- **AND** selecting a branch creates a thread with that `branch` set

#### Scenario: Worktree option in context menu

- **WHEN** the user selects "Open in worktree" for a branch
- **THEN** the worker creates a worktree and a thread with `worktreePath` set
- **AND** subsequent agent work runs in the worktree directory

#### Scenario: Non-git project context menu

- **WHEN** the user opens the context menu for a non-git project
- **THEN** the menu shows a disabled "Not a git repository" item
- **AND** the user can still create a thread via default click
