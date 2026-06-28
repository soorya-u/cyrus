#!/usr/bin/env bash

set -euo pipefail

prev_head="${1:-}"
null_oid="0000000000000000000000000000000000000000"

# Ordinary checkout
if [[ -n "$prev_head" && "$prev_head" != "$null_oid" ]]; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

echo "→ Bootstrapping worktree: $repo_root"

if command -v mise >/dev/null 2>&1; then
  echo "→ mise install"
  mise trust --quiet "$repo_root" || true
  mise install

  echo "→ dotagents deploy"
  mise exec -- dotagents deploy
fi

echo "→ bun install"
bun install

main_worktree="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
if [[ -n "${main_worktree:-}" && "$main_worktree" != "$repo_root" ]]; then
  echo "→ seeding env files from $main_worktree"
  while IFS= read -r example; do
    target="${example%.example}"
    rel="${target#"$repo_root"/}"

    [[ -e "$target" ]] && continue
    if [[ -e "$main_worktree/$rel" ]]; then
      cp "$main_worktree/$rel" "$target"
      echo "  ✓ $rel"
    else
      echo "  ! $rel missing in primary worktree — fill it in (see $rel.example)"
    fi
  done < <(find "$repo_root" -name node_modules -prune -o -name '.env.example' -print)
fi

echo "✓ Worktree ready."
