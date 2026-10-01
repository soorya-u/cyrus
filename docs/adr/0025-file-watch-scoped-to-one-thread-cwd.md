# File watch, scoped to one thread's effective cwd, supersedes event-only refresh

_Decided 2026-09-02, while designing issue [#162](https://github.com/soorya-u/cyrus/issues/162)._

ADR-0011 deliberately gave the diff panel (now the **Diff tab**, one of two tabs in the **Workspace drawer** alongside the new **Explorer tab**) no filesystem watcher, refreshing only on known events (panel open, turn end, checkout, manual sync). That broke down once file browsing (not just diffs) entered scope: none of those triggers see a file changed by something outside Cyrus's own control — a user editing in another editor while the drawer is open. A **File watch** closes that gap: a native watcher (`@parcel/watcher`; spike-verified under Bun and `bun build --compile` — the compiled binary only works because the build script rewrites its platform-computed `require()` and embeds the native binding, as it already does for node-datachannel and turso) runs only for a thread's effective cwd, started when a peer subscribes and stopped when it unsubscribes, so cost stays bounded to the one thread actually being viewed rather than every worktree on the worker. Changed paths are filtered through `es-git`'s existing `repo.isPathIgnored(path)` (tracked files are never treated as ignored) before anything is forwarded, so no separate `.gitignore`-parsing dependency is introduced. ADR-0011's rejection of *polling* stands, and the watcher replaces the turn-end trigger rather than sitting beside it: it sees the same edits plus the ones no known event covers. Panel open, checkout and manual sync still refresh on their own.

## Considered options

- Keep event-only refresh and add polling during active turns to bridge mid-turn staleness — rejected: still misses external edits entirely, and polling has no real advantage once a genuine event source (the watcher) is available.
- Watch every project/worktree on the worker continuously — rejected: unbounded resource cost: only one project is ever being viewed at a time.
- `chokidar` — rejected: falls back to polling on some platforms/large trees, no native gitignore support, unverified under Bun; `@parcel/watcher`'s native backend selection (FSEvents/inotify/ReadDirectoryChangesW) avoids this, consistent with picking `es-git` over pure-JS git libraries in ADR-0011.
- Watchman — rejected: requires an external daemon process installed on the host, disproportionate operational cost for a view-only feature.

## Consequences

- A subscription is one open `watchGitFiles` event-iterator call; closing or aborting it stops the native watcher. Subscriptions are not shared, so two controllers on the same thread run two watchers.
- Events are debounced (300ms) into a payload-less signal; the controller reacts by invalidating its git queries, and the Explorer reloads the folders it has visited.
- Under `.git/` only `HEAD`, `index` and `refs/` count as changes, so commits and checkouts refresh status without lock-file noise. In a linked worktree `.git` is a file pointing at the main repo's git dir, so those commit/checkout events are not seen there; working-tree edits still are.
- `node_modules` is excluded from the native watch outright because it is expensive to watch and ignored by every project.
- The turn-end git-query invalidation was removed: the watcher sees the same edits, whether they come from an agent, a shell command or an external editor.
