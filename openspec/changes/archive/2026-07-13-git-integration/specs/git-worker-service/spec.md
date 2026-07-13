## ADDED Requirements

### Requirement: es-git module on CLI worker

The CLI worker SHALL implement git operations in `apps/cli/src/git/` using the `es-git` library. All git commands SHALL run on the device that owns the project's working copy.

#### Scenario: Open valid repository

- **WHEN** `openRepository(cwd)` is called for a directory inside a git work tree
- **THEN** the module returns a repository handle
- **AND** subsequent status and diff operations succeed

#### Scenario: Non-repository directory

- **WHEN** `openRepository(cwd)` is called for a directory that is not a git repository
- **THEN** the module returns `{ isRepo: false }` without throwing to the RPC layer

### Requirement: Git status at effective cwd

The worker SHALL compute git status for the thread's effective cwd (`thread.worktreePath ?? project.cwd`). Status SHALL include current ref name, changed file list with per-file status, and aggregate insertion/deletion counts.

#### Scenario: Working tree changes against HEAD

- **WHEN** `getGitStatus({ threadId })` is called and the effective cwd is a git repo with local changes
- **THEN** the response includes `isRepo: true`, `refName`, `files[]` with `{ path, status, insertions, deletions }`, and aggregate `insertions`/`deletions`
- **AND** untracked files are included in the file list

#### Scenario: Clean repository

- **WHEN** `getGitStatus({ threadId })` is called and there are no changes
- **THEN** the response includes `isRepo: true`, `refName`, empty `files[]`, and zero insertions/deletions

### Requirement: Unified diff patches

The worker SHALL produce unified diff text suitable for `@pierre/diffs` via es-git `diff.print()`. Patches SHALL represent working tree + index vs `HEAD`, including untracked file content when requested.

#### Scenario: Full repository patch

- **WHEN** `getGitPatch({ threadId })` is called without a path
- **THEN** the response contains a unified diff string covering all changed files

#### Scenario: Single file patch

- **WHEN** `getGitPatch({ threadId, path })` is called with a file path
- **THEN** the response contains a unified diff string for that file only

### Requirement: Git ref listing and checkout

The worker SHALL expose local branch/ref listing and checkout at the thread's effective cwd.

#### Scenario: List local branches

- **WHEN** `listGitRefs({ threadId })` is called for a git repository
- **THEN** the response includes local refs with `{ name, current }` indicating the checked-out branch

#### Scenario: Checkout branch

- **WHEN** `checkoutGitRef({ threadId, refName })` is called
- **THEN** the worker runs checkout at the effective cwd
- **AND** returns success or a descriptive error (e.g. dirty working tree)

### Requirement: Worktree create and remove

The worker SHALL create and remove git worktrees and persist the worktree path on the thread record.

#### Scenario: Create worktree for branch

- **WHEN** `createGitWorktree({ threadId, refName })` is called
- **THEN** the worker creates a worktree at the default or specified path
- **AND** updates `thread.worktreePath` to the new absolute path

#### Scenario: Remove worktree on thread cleanup

- **WHEN** a thread with `worktreePath` set is deleted
- **THEN** the worker attempts `git worktree remove` for that path
- **AND** clears `worktreePath` on the thread record

### Requirement: Git controller RPC contract

The controller contract in `@cyrus/connections` SHALL define git operations with Zod schemas in `@cyrus/schemas/rtc/git`. Input schemas SHALL use `threadId` as the primary scope key.

#### Scenario: Contract exposes git operations

- **WHEN** `controllerContract` is inspected
- **THEN** it includes `getGitStatus`, `getGitPatch`, `listGitRefs`, `checkoutGitRef`, `createGitWorktree`, and `removeGitWorktree`
- **AND** each operation imports schemas from `@cyrus/schemas/rtc/git`
