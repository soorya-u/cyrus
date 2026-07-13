## Context

Cyrus threads run agents against a project's `cwd` on the owning worker device. The web thread workspace has a "Diffs" side panel toggled from `thread-header.tsx`, but it currently renders `conversation.diffs` — ACP tool-call patches folded from the event log (`enrichDiffContent` → `fold()` → `DiffPanel`). This does not reflect the repo's actual git state.

GitHub issue #24 calls for git diffs, branch switching, and worktree support. t3code solves this with a worker-side git layer (`GitManager`, `VcsStatusBroadcaster`), thread-level `branch`/`worktreePath`, and a diff panel fed by real VCS status — not conversation events. Cyrus should follow the same architectural split: **git context is a worker concern resolved per thread; the diff panel is a consumer.**

The CLI compiles to a standalone binary via `bun build --compile`. es-git (libgit2 via napi-rs) has been spike-tested: it runs under Bun and survives compile, producing unified diff text compatible with the existing `@pierre/diffs` renderer.

## Goals / Non-Goals

**Goals:**

- Single git abstraction on the CLI worker using es-git
- Thread-aware cwd resolution: `worktreePath ?? project.cwd`
- Diff side panel shows git working tree vs `HEAD` at effective cwd
- Branch indicator, branch list, checkout, and worktree creation for thread isolation
- Refresh diffs on panel open, turn completion, branch switch, and manual sync — no filesystem watcher
- Keep agent-reported `DiffRow` entries in the chat feed unchanged

**Non-goals:**

- Commit, push, PR, remote ahead/behind status
- Diff vs configurable base ref (e.g. `main`) in v1
- Mobile git UI (RPC/hooks should be platform-agnostic; web ships first)
- Replacing `@pierre/diffs` or adding diff workers (t3code pattern deferred)
- Server-side git operations (git runs only on the owning worker)

## Decisions

### 1. es-git on the CLI worker

**Decision:** Use es-git for all git read/write operations in `apps/cli/src/git/`.

**Rationale:** Typed API, `diff.print()` maps directly to `@pierre/diffs`, supports branch checkout and worktrees, prebuilt native binaries (no node-gyp), verified with `bun build --compile`.

**Alternatives considered:**
- Shell `git` via `Bun.spawn` — simpler, zero native deps, but requires stdout parsing and separate code path for branch/worktree later
- `simple-git` — still wraps shell git; no advantage over direct spawn
- `isomorphic-git` — pure JS but incomplete and slow; wrong for worker with git binary available

**Key es-git options for status/diff:**

```typescript
repo.diffTreeToWorkdirWithIndex(headTree, {
  includeUntracked: true,
  showUntrackedContent: true,  // required for untracked file patches
  recurseUntrackedDirs: true,
});
diff.findSimilar({ renames: true });
```

### 2. Effective cwd resolution (central abstraction)

**Decision:** Introduce `resolveGitCwd(thread, project): string` used by agent sessions, git RPC handlers, and (indirectly) the diff panel.

```
effectiveCwd = thread.worktreePath ?? project.cwd
```

**Rationale:** Diff panel, branch picker, and agent execution share one cwd source. Adding worktrees later does not require diff panel rewrites.

**Alternatives considered:**
- Project-level git only — rejected; breaks worktree isolation
- Separate cwd per agent session without persistence — rejected; thread metadata must survive restarts

### 3. Git RPC: thread-scoped and project-scoped

**Decision:** Git RPCs use two scope keys depending on whether a thread exists:

- **Thread-scoped** (`threadId`) — diff panel, branch picker on open thread, checkout, worktree mutations. Worker resolves `thread → project → effective cwd`.
- **Project-scoped** (`projectId`) — sidebar "+ New thread" context menu before a thread exists. Worker resolves `project → project.cwd`.

**Rationale:** The web client never hardcodes `project.cwd`. Thread-scoped ops respect worktree isolation. Project-scoped ops cover pre-thread UX (branch list, `isRepo` check) without creating a throwaway thread.

**Thread-scoped operations:**

| RPC | Purpose |
|-----|---------|
| `getGitStatus({ threadId })` | `{ isRepo, refName, files[], insertions, deletions }` at effective cwd |
| `getGitPatch({ threadId, path? })` | unified diff string for one or all files |
| `listGitRefs({ threadId, query? })` | local branches at effective cwd (header picker) |
| `checkoutGitRef({ threadId, refName })` | switch branch at effective cwd |
| `createGitWorktree({ threadId, refName, path? })` | create worktree; update `thread.worktreePath` |
| `removeGitWorktree({ threadId })` | remove worktree; clear `thread.worktreePath` |

**Project-scoped operations:**

| RPC | Purpose |
|-----|---------|
| `getProjectGitStatus({ projectId })` | `{ isRepo, refName? }` at `project.cwd` — sidebar `isRepo` gate |
| `listProjectGitRefs({ projectId, query? })` | local branches at `project.cwd` — sidebar context menu |

Both scopes delegate to the same `apps/cli/src/git/` helpers; only cwd resolution differs.

### 4. Thread schema and createThread input

**Decision:** Add optional nullable git fields to `ThreadSchema`, the threads DB table, and `CreateThreadInputSchema`:

```typescript
branch: z.string().nullable().optional()       // branch selected at thread creation
worktreePath: z.string().nullable().optional() // absolute path if isolated
```

**Rationale:** Matches t3code persistence model. Backward compatible via optional/nullable. `branch` records creation intent; live ref comes from `getGitStatus`. `worktreePath` is set after `createGitWorktree` completes (not passed on initial create for worktree flow).

### 5. Diff panel data source

**Decision:** Replace `DiffPanel`'s use of `conversation.diffs` with `useGitStatus(threadId)`. Keep `DiffRow` in the chat feed for per-turn agent diffs.

**Rationale:** Two diff sources answer different questions. Panel = ground truth; feed = agent narrative.

**UI shape (t3code-inspired):**

```
┌─────────────────────────────────────────┐
│ 🌿 main  +42 / -18     [Sync] [×]       │
├──────────┬──────────────────────────────┤
│ file list│  PatchDiff (selected file)   │
└──────────┴──────────────────────────────┘
```

Show Diffs button only when `getGitStatus({ threadId }).isRepo === true`. Sidebar context menu uses `getProjectGitStatus({ projectId })` for the same gate.

### 6. Refresh strategy (no filesystem watcher)

**Decision:** Refetch git status when:

1. Diff panel opens
2. Open thread's latest turn transitions to `complete` or `interrupted`
3. Branch checkout or worktree creation mutation succeeds
4. User clicks Sync

React Query invalidation: `useGitStatus` / `useGitPatch` keys invalidate on turn-end (if diff panel open), and on successful `checkoutGitRef` / `createGitWorktree` mutations. No continuous polling or `fs.watch` on the repo.

**Rationale:** Agent-driven edits dominate; turn-end is the natural batch boundary. t3code uses on-demand fetch + invalidation, not local file watching.

### 7. Thread creation with branch/worktree

**Decision:** Extend thread creation UX:

- **Click** "+ New thread" → current behavior (immediate create on project cwd, null git fields)
- **Context menu** on "+ New thread" (git repos only, via `getProjectGitStatus` + `listProjectGitRefs`) → list branches
  - **Select branch** → two-step:
    1. `createThread({ projectId, branch })`
    2. `checkoutGitRef({ threadId, refName: branch })` at project cwd
  - **Open in worktree** → two-step:
    1. `createThread({ projectId, branch })`
    2. `createGitWorktree({ threadId, refName: branch })` — sets `thread.worktreePath`

**Rationale:** Matches t3code `.plans/git-integration-branch-picker-worktrees.md`. Worktree RPC requires a `threadId` to persist `worktreePath`, so thread must exist first. Default click unchanged for non-git projects.

### 8. Worktree path convention

**Decision:** Default worktree directory: `{projectParent}/.{repoName}-worktrees/{sanitized-branch}`.

Sanitize branch names: replace `/` with `-`, strip unsafe characters.

**Rationale:** Keeps worktrees outside the repo, predictable cleanup path.

## Risks / Trade-offs

- **[Risk] es-git prebuild missing for a worker platform** → Mitigation: task 8.7 verifies es-git in compiled `cyrusd` on linux; extend to darwin CI targets; fallback to shell git for read-only status if needed (document as escape hatch, not v1 path)
- **[Risk] libgit2 behavior differs from user's git CLI** → Mitigation: v1 scope is standard status/diff/checkout/worktree; document known gaps (submodules, sparse checkout)
- **[Risk] Compiled binary size increase** → Mitigation: acceptable for worker distribution; es-git spike showed ~6 module bundle
- **[Risk] Checkout on dirty working tree fails** → Mitigation: surface es-git error in branch picker; do not auto-stash in v1
- **[Risk] Orphaned worktrees on thread delete** → Mitigation: `deleteThread` handler calls `removeGitWorktree` when `worktreePath` is set; best-effort cleanup
- **[Risk] Non-owner UI device calls git RPC** → Mitigation: git RPC runs on owning worker only (existing RTC routing); no change needed

## Migration Plan

1. Add DB migration for `branch`, `worktreePath` columns (nullable, default null)
2. Deploy CLI with es-git + RPC handlers; old clients ignore new endpoints
3. Deploy web with new diff panel; falls back gracefully when `isRepo: false` (button hidden)
4. No server (Cloudflare) changes — git is worker-local

Rollback: hide Diffs button via feature flag; revert panel to conversation diffs if needed (old data path still exists in fold).

## Resolved Questions

- **Checkout on branch-only thread create?** Yes — `createThread({ branch })` then `checkoutGitRef` at project cwd. Worktree threads skip checkout (worktree creation checks out the branch in the new directory).
- **Worktree create ordering?** Thread first, then `createGitWorktree({ threadId })`. RPC updates `thread.worktreePath` on success.
- **Auto-remove worktree on thread delete?** Best-effort `removeGitWorktree` in `deleteThread` handler; log failure.
- **Cross-thread cache invalidation?** v1 per-thread React Query keys; refetch on triggers. No shared worker-side cache across threads.
