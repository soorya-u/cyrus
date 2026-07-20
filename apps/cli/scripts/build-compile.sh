#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cli_root="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$cli_root/../.." && pwd)"
cd "$cli_root"

# Native addons and drizzle-kit cannot be embedded in a Bun compiled binary —
# leave them external and stage them next to the outfile. Bun's --compile
# resolver also ignores package "exports" / nested "main" / "#imports" for
# externals, so staging adds filesystem shims the resolver can see.
bun build src/cli.ts \
	--compile \
	--env 'CLI_PUBLIC_*' \
	--external drizzle-kit \
	--external node-datachannel \
	--external es-git \
	--external '@tursodatabase/database' \
	--external '@ff-labs/fff-node' \
	--outfile dist/cyrusd

stage_dir="$cli_root/dist/node_modules"
rm -rf "$stage_dir"
mkdir -p "$stage_dir"

resolve_store_node_modules() {
	local from_dir="$1"
	local id="$2"
	local pkg_json pkg_dir parent_dir
	pkg_json="$(
		cd "$from_dir"
		bun -e "console.log(Bun.resolveSync(\"$id/package.json\", import.meta.path))"
	)"
	pkg_dir="$(dirname "$pkg_json")"
	parent_dir="$(dirname "$pkg_dir")"
	if [[ "$(basename "$parent_dir")" == @* ]]; then
		dirname "$parent_dir"
	else
		echo "$parent_dir"
	fi
}

# Copy one package path into dest, dereferencing bun-store symlinks so the
# staged tree is self-contained under dist/node_modules.
copy_real() {
	local src="$1"
	local dest="$2"
	local real
	if [[ -L "$src" ]]; then
		real="$(cd "$(dirname "$src")" && realpath "$(readlink "$src")")"
	else
		real="$src"
	fi
	rm -rf "$dest"
	cp -a "$real" "$dest"
}

merge_store_node_modules() {
	local store_node_modules="$1"
	local entry name scoped
	shopt -s nullglob
	for entry in "$store_node_modules"/*; do
		name="$(basename "$entry")"
		if [[ "$name" == .bin ]]; then
			continue
		fi
		if [[ -d "$entry" && ! -L "$entry" && "$name" == @* ]]; then
			mkdir -p "$stage_dir/$name"
			for scoped in "$entry"/*; do
				copy_real "$scoped" "$stage_dir/$name/$(basename "$scoped")"
			done
		else
			copy_real "$entry" "$stage_dir/$name"
		fi
	done
	shopt -u nullglob
}

place_platform_node() {
	local loader_dir="$1"
	local package_prefix="$2"
	local node_prefix="$3"
	local platform_dir node_file
	local os arch target

	case "$(uname -s)" in
	Linux) os=linux ;;
	Darwin) os=darwin ;;
	MINGW*|MSYS*|CYGWIN*) os=win32 ;;
	*) return 0 ;;
	esac

	case "$(uname -m)" in
	x86_64|amd64) arch=x64 ;;
	arm64|aarch64) arch=arm64 ;;
	*) return 0 ;;
	esac

	if [[ "$os" == linux ]]; then
		target="${os}-${arch}-gnu"
	elif [[ "$os" == win32 ]]; then
		target="${os}-${arch}-msvc"
	else
		target="${os}-${arch}"
	fi

	platform_dir="$stage_dir/${package_prefix}-${target}"
	if [[ ! -d "$platform_dir" ]]; then
		return 0
	fi
	node_file="$(find "$platform_dir" -maxdepth 1 -name "${node_prefix}.${target}.node" | head -1 || true)"
	if [[ -n "$node_file" ]]; then
		cp "$node_file" "$loader_dir/"
	fi
}

merge_store_node_modules "$(resolve_store_node_modules "$repo_root/shared/database" "drizzle-kit")"
merge_store_node_modules "$(resolve_store_node_modules "$repo_root/shared/database" "drizzle-orm")"
merge_store_node_modules "$(resolve_store_node_modules "$repo_root/shared/connections" "node-datachannel")"
merge_store_node_modules "$(resolve_store_node_modules "$cli_root" "es-git")"
merge_store_node_modules "$(resolve_store_node_modules "$cli_root" "@tursodatabase/database")"
merge_store_node_modules "$(resolve_store_node_modules "$cli_root" "@ff-labs/fff-node")"
# ffi-rs is only reachable via symlink from @ff-labs/fff-node; also pull @yuuang.
merge_store_node_modules "$(ls -d "$repo_root"/node_modules/.bun/ffi-rs@*/node_modules | head -1)"

place_platform_node "$stage_dir/es-git" "es-git" "es-git"
place_platform_node \
	"$stage_dir/@tursodatabase/database" \
	"@tursodatabase/database" \
	"turso"
place_platform_node "$stage_dir/ffi-rs" "@yuuang/ffi-rs" "ffi-rs"

mkdir -p "$stage_dir/drizzle-kit/payload"
cp "$stage_dir/drizzle-kit/payload-sqlite.mjs" "$stage_dir/drizzle-kit/payload/sqlite.js"

printf '%s\n' 'export * from "./dist/esm/polyfill/index.mjs";' \
	> "$stage_dir/node-datachannel/polyfill.js"

printf '%s\n' 'export * from "./dist/src/index.js";' \
	> "$stage_dir/@ff-labs/fff-node/index.js"

printf '%s\n' 'export * from "./dist/index.js";' \
	> "$stage_dir/@tursodatabase/database-common/index.js"

mv "$stage_dir/@tursodatabase/database/index.js" \
	"$stage_dir/@tursodatabase/database/native.js"
python3 - "$stage_dir/@tursodatabase/database/package.json" <<'PY'
import json, sys
path = sys.argv[1]
data = json.load(open(path))
data.setdefault("imports", {})["#index"] = "./native.js"
with open(path, "w") as f:
	json.dump(data, f, indent=2)
	f.write("\n")
PY
printf '%s\n' 'export * from "./dist/promise.js";' \
	> "$stage_dir/@tursodatabase/database/index.js"
sed -i 's|from "#index"|from "../native.js"|g' \
	"$stage_dir/@tursodatabase/database/dist/promise.js" \
	"$stage_dir/@tursodatabase/database/dist/compat.js"
