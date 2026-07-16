# Git is worker-local via es-git, scoped by effective cwd

_Decided 2026-07-13._

All git operations run only on the owning worker using es-git (libgit2 via napi-rs, spike-verified under Bun and `bun build --compile`) — never on the server. A single `resolveGitCwd(thread, project)` (`worktreePath ?? project.cwd`) is the one cwd source for agent sessions, git RPCs, and the diff panel, so worktree threads isolate without special-casing. The diff panel shows real working-tree-vs-HEAD state ("panel = ground truth"), while agent-reported per-turn diffs stay in the feed ("feed = agent narrative"); refresh is event-driven (panel open, turn end, checkout, manual sync) with deliberately no filesystem watcher or polling.

## Considered options

- Shelling out to `git` via `Bun.spawn` — rejected: stdout parsing and divergent code paths.
- `simple-git` (still wraps shell git) and `isomorphic-git` (incomplete, slow) — rejected.
- Project-level-only git context — rejected: breaks per-thread worktree isolation.
