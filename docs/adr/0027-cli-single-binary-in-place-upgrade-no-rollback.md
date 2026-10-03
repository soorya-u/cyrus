# The CLI ships as one binary per platform and upgrades itself in place, with no rollback

_Decided 2026-10-02._

`cyrusd` is a single `bun build --compile` executable: native addons and the drizzle migrations are embedded, so a release asset is one raw file per platform (`cyrusd-<os>-<arch>[.exe]`) plus a `SHA256SUMS`, built natively on five runners (linux x64/arm64 glibc, darwin x64/arm64, windows x64). It is distributed through GitHub Release assets with static, version-agnostic `install.sh` / `install.ps1` served from the web app (they resolve the latest release at run time; `CYRUS_VERSION` pins), and through npm as `@soorya-u/cyrusd` plus per-platform `@soorya-u/cyrusd-<platform>` packages. `cyrusd upgrade` downloads the matching asset, verifies its checksum, confirms the new binary runs `--version`, and atomically renames it over `~/.cyrus/bin/cyrusd`; on Windows the running `.exe` is renamed aside first. An install that is not at that path (npm, or anything else) is never overwritten — the command points at the right tool instead.

`upgrade` refuses while a worker is running (pid file, under the worker lock) and tells the user to `cyrusd stop` first; it never stops or restarts the worker, because stopping ends the in-flight agent turns. It holds the worker lock for the swap so a concurrent `start` cannot launch a half-replaced binary.

There is deliberately no rollback command and no kept `cyrusd.previous`: schema changes are forward-only embedded migrations, so an older binary pointed at a newer `store.db` would run against a schema it does not understand. `upgrade` therefore only ever moves forward: it takes no target version, installs only a release newer than the running binary, and never downgrades (a deliberate older install means rerunning the installer with `CYRUS_VERSION`). `upgrade` follows the latest stable release; `upgrade --rc` follows the newest release including release candidates. The binary is verified before the swap so a bad download never replaces a working one.

## Considered options

- Versioned directories plus a repointed symlink — rejected once the CLI became a single file: it adds symlink handling (awkward on Windows) and pruning for a rollback we decided not to offer.
- `upgrade` stops, swaps and restarts the worker — rejected: restarting is a decision about the user's running work.
- A guarded `--rollback` that compares `__drizzle_migrations` against the old binary's embedded migrations — deferred until someone needs it.

## Consequences

- The install root is fixed at `~/.cyrus` and does not follow `CYRUS_HOME`, which holds one worker's data and can differ per worker.
- The asset-naming contract is shared by both installers, the upgrader, and the npm packaging, and is pinned by a test.
- Linux musl (Alpine) and Windows arm64 are not covered.
- Stores created by development builds from before the embedded migrations (the schema was pushed with drizzle-kit's `pushSchema`, with no migration history) are not baselined: the `init` migration fails on the tables that already exist, and the worker refuses to start. Delete `~/.cyrus/store.db` once. No released version predates the migrations, and Cyrus keeps no backward compatibility during active development (`docs/guides/CODING_STANDARDS.md`).
