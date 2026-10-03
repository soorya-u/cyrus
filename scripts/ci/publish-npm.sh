#!/usr/bin/env bash
set -euo pipefail

TAG="${TAG:?TAG is required}"
VERSION="${TAG#v}"
REPO_URL="git+https://github.com/soorya-u/cyrus.git"
SCOPE="@soorya-u"

if [[ "$VERSION" == *-* ]]; then
  NPM_TAG=$(echo "${VERSION#*-}" | sed 's/[^a-zA-Z].*//')
  NPM_TAG="${NPM_TAG:-next}"
else
  NPM_TAG="latest"
fi

# release asset | package suffix | npm os | npm cpu
PLATFORMS=(
  "cyrusd-linux-x64|linux-x64|linux|x64"
  "cyrusd-linux-arm64|linux-arm64|linux|arm64"
  "cyrusd-darwin-arm64|darwin-arm64|darwin|arm64"
  "cyrusd-darwin-x64|darwin-x64|darwin|x64"
  "cyrusd-windows-x64.exe|win32-x64|win32|x64"
)

publish() {
  local name="$1" dir="$2"
  if npm view "${name}@${VERSION}" version >/dev/null 2>&1; then
    echo "${name}@${VERSION} is already published; skipping"
    return
  fi
  (cd "$dir" && npm publish --access public --provenance --tag "$NPM_TAG")
}

OPTIONAL_DEPS=""
for entry in "${PLATFORMS[@]}"; do
  IFS='|' read -r asset suffix os cpu <<<"$entry"
  pkg="${SCOPE}/cyrusd-${suffix}"
  dir="./npm-packages/${suffix}"
  bin="cyrusd"
  [[ "$os" == "win32" ]] && bin="cyrusd.exe"

  mkdir -p "$dir"
  gh release download "$TAG" -p "$asset" -D "$dir"
  mv "${dir}/${asset}" "${dir}/${bin}"
  chmod +x "${dir}/${bin}"

  cat >"${dir}/package.json" <<JSON
{
  "name": "${pkg}",
  "version": "${VERSION}",
  "description": "Platform binary for cyrusd (${suffix})",
  "os": ["${os}"],
  "cpu": ["${cpu}"],
  "files": ["${bin}"],
  "repository": { "type": "git", "url": "${REPO_URL}" }
}
JSON
  publish "$pkg" "$dir"
  OPTIONAL_DEPS="${OPTIONAL_DEPS}    \"${pkg}\": \"${VERSION}\",
"
done

mkdir -p ./npm-root/bin
cp "$(dirname "${BASH_SOURCE[0]}")/npm-launcher.cjs" ./npm-root/bin/cyrusd.cjs
chmod +x ./npm-root/bin/cyrusd.cjs

cat >./npm-root/package.json <<JSON
{
  "name": "${SCOPE}/cyrusd",
  "version": "${VERSION}",
  "description": "The Cyrus worker: control AI coding agents running on your own devices",
  "bin": { "cyrusd": "bin/cyrusd.cjs" },
  "optionalDependencies": {
${OPTIONAL_DEPS%,
}
  },
  "files": ["bin/"],
  "repository": { "type": "git", "url": "${REPO_URL}" }
}
JSON

publish "${SCOPE}/cyrusd" ./npm-root
