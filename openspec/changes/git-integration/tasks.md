## 1. Schemas and contract

- [x] 1.1 Add `@cyrus/schemas/rtc/git.ts` with status, patch, refs, checkout, and worktree Zod schemas
- [x] 1.2 Extend `ThreadSchema` with optional nullable `branch` and `worktreePath`
- [x] 1.3 Extend `CreateThreadInputSchema` with optional `branch` and `worktreePath`
- [x] 1.4 Add project-scoped git schemas (`listGitRefs`, `getProjectGitStatus` by `projectId`)
- [x] 1.5 Add git operations to `controllerContract` in `@cyrus/connections`
- [x] 1.6 Add `RTC_OPERATION_KEYS` entries for git queries in `@cyrus/constants`

## 2. Database

- [x] 2.1 Add `branch` and `worktreePath` nullable columns to threads table (Turso migration)
- [x] 2.2 Update thread repository create/read/update for git context fields
- [x] 2.3 Add `resolveThreadGitCwd(threadId)` helper (thread → project → effective cwd)

## 3. CLI git service (es-git)

- [x] 3.1 Add `es-git` dependency to `apps/cli`
- [x] 3.2 Implement `apps/cli/src/git/open.ts` — safe `openRepository` with `isRepo: false` fallback
- [x] 3.3 Implement `apps/cli/src/git/status.ts` — `getGitStatus(cwd)` with untracked + rename detection
- [x] 3.4 Implement `apps/cli/src/git/patch.ts` — `getGitPatch(cwd, path?)` via `diff.print()`
- [x] 3.5 Implement `apps/cli/src/git/refs.ts` — `listGitRefs(cwd)` and `checkoutGitRef(cwd, refName)`
- [x] 3.6 Implement `apps/cli/src/git/worktree.ts` — create/remove with sanitized default paths
- [x] 3.7 Unit tests for status, patch, and branch name sanitization

## 4. CLI controller handlers

- [x] 4.1 Add `apps/cli/src/handlers/controller/git.ts` wiring git service to thread-scoped RPC
- [x] 4.2 Add project-scoped handlers: `listGitRefs({ projectId })` and `getProjectGitStatus({ projectId })` using `project.cwd`
- [x] 4.3 Register git handlers in controller index
- [x] 4.4 Update `ThreadCoordinator.resolveCwd()` to use `thread.worktreePath ?? project.cwd`
- [x] 4.5 Extend `createThread` handler to persist `branch`/`worktreePath`; checkout at project cwd on branch-only create
- [x] 4.6 On `deleteThread`, best-effort `removeGitWorktree` when `worktreePath` is set
- [ ] 4.7 Integration test: getGitStatus on a temp git repo via controller handler

## 5. Shared hooks

- [x] 5.1 Add `useGitStatus(threadId)` with React Query (enabled when threadId set)
- [x] 5.2 Add `useGitPatch(threadId, path?)` for selected file patch
- [x] 5.3 Add `useProjectGitStatus(projectId)` and `useProjectGitRefs(projectId)` for sidebar pre-thread UX
- [x] 5.4 Add git mutation hooks: `useCheckoutRef`, `useCreateWorktree`, `useListGitRefs`
- [x] 5.5 Invalidate git queries on turn complete/interrupted (open thread + diff panel open)
- [x] 5.6 Invalidate git queries on successful checkout and worktree creation mutations
- [x] 5.7 Export hooks from `@cyrus/hooks`

## 6. Web — diff panel

- [x] 6.1 Refactor `DiffPanel` to consume `useGitStatus` / `useGitPatch` instead of `conversation.diffs`
- [x] 6.2 Add file list column + selected file patch view (t3code-inspired layout)
- [x] 6.3 Add Sync button and loading/empty states for git-backed panel
- [x] 6.4 Conditionally show Diffs button in `thread-header.tsx` when `isRepo === true`
- [x] 6.5 Refresh git status when diff panel opens (`useEffect` on `diffOpen`)

## 7. Web — branch and thread creation

- [x] 7.1 Add branch indicator in `thread-header.tsx` from `useGitStatus().refName`
- [x] 7.2 Add branch picker dropdown with checkout via `useCheckoutRef`
- [x] 7.3 Add context menu on sidebar "+ New thread" listing branches (`useProjectGitRefs`)
- [x] 7.4 Wire branch create: `createThread({ branch })` then checkout; worktree create: `createThread({ branch })` then `createGitWorktree({ threadId, refName })`
- [x] 7.5 Show disabled "Not a git repository" item for non-git projects in context menu

## 8. Verification

- [ ] 8.1 Manual: open diff panel on git project — shows branch, files, patches
- [ ] 8.2 Manual: agent completes turn — diff panel updates without reload
- [ ] 8.3 Manual: switch branch — header and diff panel reflect new ref
- [ ] 8.4 Manual: create thread in worktree — agent edits appear in worktree diff, not project root
- [ ] 8.5 Manual: non-git project — no Diffs button, no branch picker
- [x] 8.6 `bun check:types` and `bun test` pass for touched packages
- [x] 8.7 Verify es-git works in compiled `cyrusd` binary (linux)
