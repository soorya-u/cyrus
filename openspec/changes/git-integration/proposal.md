## Why

The thread workspace "Diffs" button toggles a panel that renders ACP tool-call patches from the conversation event log, not the project's actual git working tree. Users controlling agents on remote laptops need ground-truth visibility into what changed in the repo — current branch, file list, and unified diffs — plus the ability to switch branches and isolate work in git worktrees without rewriting the panel later.

## What Changes

- Add worker-side git service on the CLI using **es-git** (status, patch, list refs, checkout, create/remove worktree)
- Introduce controller RPC operations for git status and git actions scoped by `threadId` (worker resolves effective cwd)
- Extend thread metadata with optional `branch` and `worktreePath`; agent sessions use `worktreePath ?? project.cwd`
- Replace the diff side panel data source: git working tree vs `HEAD` at effective cwd (keep per-turn `DiffRow` entries in the chat feed)
- Show the Diffs button only when the project's effective git context is a repository
- Add branch indicator and branch picker in the thread header; refresh diffs on panel open, turn completion, branch switch, and manual sync
- Support creating threads on a chosen branch, optionally in a new worktree (sidebar context menu pattern, t3code-inspired)

## Capabilities

### New Capabilities

- `git-worker-service`: es-git module on CLI, git RPC handlers, effective-cwd resolution, cache/invalidation
- `git-diff-panel`: thread workspace side panel showing branch, file list, +/- stats, and `@pierre/diffs` patches from git
- `git-thread-context`: thread `branch`/`worktreePath` fields, coordinator cwd routing, branch picker, checkout, worktree create/remove

### Modified Capabilities

- `wire-schemas`: new `@cyrus/schemas/rtc/git` module; extend `ThreadSchema` with optional git context fields; extend controller contract

## Non-goals

- Diff vs arbitrary base ref (e.g. `main`) — v1 uses working tree vs `HEAD` at effective cwd
- Commit, push, PR creation, remote status (ahead/behind), GitHub/GitLab integration
- Replacing per-turn `DiffRow` entries in the chat feed (agent-reported diffs stay in the timeline)
- Git operations from non-owner UI devices without routing through the owning worker
- File tree / `@files` composer integration
- Mobile git UI in v1 (worker RPC should be shared; web ships first)

## Impact

- **Dependency**: `es-git` added to `apps/cli`
- `apps/cli`: new `src/git/` module, controller handlers, thread cwd resolution in `ThreadCoordinator`
- `shared/schemas`: `rtc/git.ts`, `ThreadSchema` additions
- `shared/connections`: controller contract new git operations
- `shared/hooks`: `useGitStatus`, invalidation on turn complete / branch switch
- `shared/database`: thread table columns for `branch`, `worktreePath`
- `apps/web`: `diff-panel.tsx`, `thread-header.tsx`, thread creation UX in sidebar
- Closes GitHub issue #24
