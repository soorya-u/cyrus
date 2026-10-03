export const RELEASE_REPO = "soorya-u/cyrus";

export const RELEASE_CHECKSUMS_FILE = "SHA256SUMS";

export const LATEST_RELEASE_API = `https://api.github.com/repos/${RELEASE_REPO}/releases/latest`;

export const RELEASES_API = `https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=30`;

export const RELEASE_PLATFORMS = [
	{ os: "linux", arch: "x64" },
	{ os: "linux", arch: "arm64" },
	{ os: "darwin", arch: "x64" },
	{ os: "darwin", arch: "arm64" },
	{ os: "windows", arch: "x64" },
] as const;

export type ReleasePlatform = (typeof RELEASE_PLATFORMS)[number];
export type ReleaseOs = ReleasePlatform["os"];
export type ReleaseArch = ReleasePlatform["arch"];

/** The one naming contract shared by the build matrix, both installers and `cyrusd upgrade`. */
export function releaseAssetName(os: ReleaseOs, arch: ReleaseArch): string {
	return `cyrusd-${os}-${arch}${os === "windows" ? ".exe" : ""}`;
}

export function releaseAssetUrl(version: string, asset: string): string {
	return `https://github.com/${RELEASE_REPO}/releases/download/v${version}/${asset}`;
}
