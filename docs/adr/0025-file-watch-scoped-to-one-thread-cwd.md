# File watch, scoped to one thread's effective cwd, supersedes event-only refresh

_Decided 2026-09-02, while designing issue [#162](https://github.com/soorya-u/cyrus/issues/162)._

ADR-0011 deliberately gave the diff panel (now the **Diff tab**, one of two tabs in the **Workspace drawer** alongside the new **Explorer tab**) no filesystem watcher, refreshing only on known events (panel open, turn end, checkout, manual sync). That broke down once file browsing (not just diffs) entered scope: none of those triggers see a file changed by something outside Cyrus's own control — a user editing in another editor while the drawer is open. A **File watch** closes that gap: a native watcher (`@parcel/watcher`, pending a Bun/`bun build --compile` compatibility spike — same gate ADR-0011 applied to `es-git`) runs only for a thread's effective cwd, started when a peer subscribes and stopped when it unsubscribes, so cost stays bounded to the one thread actually being viewed rather than every worktree on the worker. Changed paths are filtered through `es-git`'s existing `repo.isPathIgnored(path)` (`.git/` already excluded by its default rules) before anything is forwarded, so no separate `.gitignore`-parsing dependency is introduced. ADR-0011's rejection of *polling* stands: the known-event triggers (turn end, checkout) and the new tool-call/shell-end triggers stay in place for the cases they already cover well; the watcher only fills the gap they can't.

## Considered options

- Keep event-only refresh and add polling during active turns to bridge mid-turn staleness — rejected: still misses external edits entirely, and polling has no real advantage once a genuine event source (the watcher) is available.
- Watch every project/worktree on the worker continuously — rejected: unbounded resource cost: only one project is ever being viewed at a time.
- `chokidar` — rejected: falls back to polling on some platforms/large trees, no native gitignore support, unverified under Bun; `@parcel/watcher`'s native backend selection (FSEvents/inotify/ReadDirectoryChangesW) avoids this, consistent with picking `es-git` over pure-JS git libraries in ADR-0011.
- Watchman — rejected: requires an external daemon process installed on the host, disproportionate operational cost for a view-only feature.
