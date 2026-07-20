#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cli_root="$(cd "$script_dir/.." && pwd)"
cd "$cli_root"

bun build src/cli.ts \
	--compile \
	--env 'CLI_PUBLIC_*' \
	--external drizzle-kit \
	--outfile dist/cyrusd
