#!/usr/bin/env bash

set -euo pipefail

prev_head="${1:-}"
null_oid="0000000000000000000000000000000000000000"

if [[ -n "$prev_head" && "$prev_head" != "$null_oid" ]]; then
  # Ordinary checkout (branch switch / file restore) — nothing to bootstrap.
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

echo "→ Bootstrapping worktree: $repo_root"

# 1. Pinned toolchain (bun, wrangler, vercel, neonctl, ...). New worktree paths are
#    untrusted by mise, so trust this one before installing.
if command -v mise >/dev/null 2>&1; then
  echo "→ mise install"
  mise trust --quiet "$repo_root" || true
  mise install
fi

# 2. Dependencies.
echo "→ bun install"
bun install

# 3. Seed gitignored env files from the primary worktree (they hold real secrets and
#    are never committed). Falls back to a reminder when the source is absent.
main_worktree="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
if [[ -n "${main_worktree:-}" && "$main_worktree" != "$repo_root" ]]; then
  echo "→ seeding env files from $main_worktree"
  while IFS= read -r example; do
    target="${example%.example}"                 # apps/server/.env.example -> apps/server/.env
    rel="${target#"$repo_root"/}"
    [[ -e "$target" ]] && continue               # already present in this worktree
    if [[ -e "$main_worktree/$rel" ]]; then
      cp "$main_worktree/$rel" "$target"
      echo "  ✓ $rel"
    else
      echo "  ! $rel missing in primary worktree — fill it in (see $rel.example)"
    fi
  done < <(find "$repo_root" -name node_modules -prune -o -name '.env.example' -print)
fi

echo "✓ Worktree ready."
