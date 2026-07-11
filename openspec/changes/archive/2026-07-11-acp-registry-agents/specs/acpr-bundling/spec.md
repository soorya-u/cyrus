## ADDED Requirements

### Requirement: Embedded acpr in compiled cyrusd

The compiled `cyrusd` standalone executable SHALL embed a platform-matching acpr binary at build time via Bun file embedding.

#### Scenario: Platform-specific embed at build

- **WHEN** CI builds `cyrusd` for a target platform
- **THEN** the acpr binary for that platform is embedded before `bun build --compile`

### Requirement: Extract acpr on first use

The CLI SHALL extract the embedded acpr binary to `~/.cyrus/bin/acpr` on first spawn in standalone executable mode, set executable permissions, and reuse the extracted binary on subsequent runs.

#### Scenario: First spawn extracts acpr

- **WHEN** the standalone `cyrusd` needs acpr and `~/.cyrus/bin/acpr` does not exist or the embedded rev stamp differs
- **THEN** the CLI writes the embedded bytes to `~/.cyrus/bin/acpr`, chmods `755`, and uses that path for spawn

#### Scenario: Dev mode uses PATH acpr

- **WHEN** `cyrusd` runs via `bun src/cli.ts` (not standalone)
- **THEN** the CLI resolves acpr from `CYRUS_ACPR_PATH` or `PATH` without extraction

### Requirement: npm platform packages without postinstall

The CLI npm distribution SHALL ship compiled cyrusd (with embedded acpr) via platform-specific optional dependency packages. The meta package SHALL NOT use postinstall scripts to download binaries.

#### Scenario: npm install selects platform package

- **WHEN** user installs `@cyrus/cli` on a supported platform
- **THEN** npm installs the matching platform optional dependency containing the compiled binary without running download scripts

### Requirement: Pinned acpr version

The build SHALL pin the acpr version used for embedding (via cargo-quickinstall URL or cargo install rev) and record the rev in a build stamp checked at extract time.

#### Scenario: cyrusd upgrade re-extracts acpr

- **WHEN** user upgrades `cyrusd` to a release embedding a newer acpr rev
- **THEN** the CLI re-extracts acpr to `~/.cyrus/bin/acpr` on next use
