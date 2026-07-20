#!/usr/bin/env bash
# Compile apps/cli to a single-file binary (dist/cyrusd).
# Invoked by this package's `build` script and by other tooling (e.g. E2E harness).

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cli_root="$(cd "$script_dir/.." && pwd)"
cd "$cli_root"

bun build src/cli.ts \
	--compile \
	--env 'CLI_PUBLIC_*' \
	--external drizzle-kit \
	--outfile dist/cyrusd
