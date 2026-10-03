#!/bin/sh
# Installs cyrusd, the Cyrus worker.
#
#   curl -fsSL https://cyrus.soorya.dev/install.sh | sh
#   curl -fsSL https://cyrus.soorya.dev/install.sh | CYRUS_VERSION=0.1.0 sh
#
# Resolves the latest release when it runs; CYRUS_VERSION pins one instead.
# The binary lands in ~/.cyrus/bin, which `cyrusd upgrade` keeps current.

set -eu

REPO="soorya-u/cyrus"
INSTALL_DIR="$HOME/.cyrus/bin"

say() { printf '%s\n' "$*"; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

download() {
	if have curl; then
		curl -fsSL -o "$2" "$1"
	elif have wget; then
		wget -q -O "$2" "$1"
	else
		fail "curl or wget is required"
	fi
}

fetch_text() {
	if have curl; then
		curl -fsSL "$1"
	elif have wget; then
		wget -q -O - "$1"
	else
		fail "curl or wget is required"
	fi
}

detect_os() {
	case "$(uname -s)" in
		Linux) echo linux ;;
		Darwin) echo darwin ;;
		*) fail "unsupported OS: $(uname -s). On Windows use: irm https://cyrus.soorya.dev/install.ps1 | iex" ;;
	esac
}

detect_arch() {
	case "$(uname -m)" in
		x86_64 | amd64) echo x64 ;;
		aarch64 | arm64) echo arm64 ;;
		*) fail "unsupported CPU architecture: $(uname -m)" ;;
	esac
}

latest_version() {
	fetch_text "https://api.github.com/repos/$REPO/releases/latest" |
		sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v\{0,1\}\([^"]*\)".*/\1/p' |
		head -n 1
}

sha256_of() {
	if have sha256sum; then
		sha256sum "$1" | cut -d ' ' -f 1
	elif have shasum; then
		shasum -a 256 "$1" | cut -d ' ' -f 1
	else
		fail "sha256sum or shasum is required to verify the download"
	fi
}

add_to_path() {
	case ":$PATH:" in
		*":$INSTALL_DIR:"*) return 0 ;;
	esac

	case "$(basename "${SHELL:-sh}")" in
		zsh) profile="${ZDOTDIR:-$HOME}/.zshrc"; line="export PATH=\"$INSTALL_DIR:\$PATH\"" ;;
		bash)
			if [ -f "$HOME/.bashrc" ]; then profile="$HOME/.bashrc"; else profile="$HOME/.bash_profile"; fi
			line="export PATH=\"$INSTALL_DIR:\$PATH\""
			;;
		fish) profile="$HOME/.config/fish/config.fish"; line="fish_add_path $INSTALL_DIR" ;;
		*) profile="$HOME/.profile"; line="export PATH=\"$INSTALL_DIR:\$PATH\"" ;;
	esac

	if [ -f "$profile" ] && grep -qF "$INSTALL_DIR" "$profile"; then
		return 0
	fi
	mkdir -p "$(dirname "$profile")"
	printf '\n# cyrusd\n%s\n' "$line" >>"$profile"
	say "Added $INSTALL_DIR to your PATH in $profile. Open a new shell to pick it up."
}

main() {
	os=$(detect_os)
	arch=$(detect_arch)
	asset="cyrusd-$os-$arch"

	version="${CYRUS_VERSION:-}"
	version="${version#v}"
	if [ -z "$version" ]; then
		version=$(latest_version)
		[ -n "$version" ] || fail "could not determine the latest release of $REPO"
	fi

	base="https://github.com/$REPO/releases/download/v$version"
	tmp=$(mktemp -d)
	trap 'rm -rf "$tmp"' EXIT

	say "Installing cyrusd $version ($os-$arch)"
	download "$base/$asset" "$tmp/$asset" || fail "could not download $base/$asset"
	download "$base/SHA256SUMS" "$tmp/SHA256SUMS" || fail "could not download $base/SHA256SUMS"

	expected=$(awk -v name="$asset" '$2 == name || $2 == "*" name { print $1 }' "$tmp/SHA256SUMS")
	[ -n "$expected" ] || fail "SHA256SUMS has no entry for $asset"
	[ "$(sha256_of "$tmp/$asset")" = "$expected" ] || fail "checksum mismatch for $asset; refusing to install"

	chmod +x "$tmp/$asset"
	reported=$("$tmp/$asset" --version) || fail "the downloaded binary does not run on this machine"
	[ "$reported" = "$version" ] || fail "the downloaded binary reports version $reported, not $version"

	mkdir -p "$INSTALL_DIR"
	cp "$tmp/$asset" "$INSTALL_DIR/cyrusd.new"
	mv -f "$INSTALL_DIR/cyrusd.new" "$INSTALL_DIR/cyrusd"

	say "Installed cyrusd $version to $INSTALL_DIR/cyrusd"
	add_to_path
	say ""
	say "Next: cyrusd login && cyrusd start --bg"
}

# defined as a function and called last so a truncated download never runs half a script
main "$@"
