import { createReadStream } from "node:fs";
import {
	LATEST_RELEASE_API,
	RELEASE_CHECKSUMS_FILE,
	RELEASE_PLATFORMS,
	RELEASES_API,
	type ReleasePlatform,
	releaseAssetUrl,
} from "@cyrus/constants/release";
import {
	UpgradeDownloadError,
	UpgradeIntegrityError,
	UpgradeUnsupportedPlatformError,
} from "@cyrus/errors/upgrade";
import { Result } from "better-result";
import semver from "semver";
import { z } from "zod";
import { toMessage } from "@/utils/error";

export type Fetch = typeof fetch;

const LatestReleaseSchema = z.object({ tag_name: z.string() });
const ReleaseListSchema = z.array(
	z.object({ tag_name: z.string(), draft: z.boolean() })
);
const LEADING_V = /^v/;
const CHECKSUM_LINE = /^([0-9a-f]{64}) [ *](.+)$/;
const NEWLINE = /\r?\n/;

export function stripLeadingV(version: string): string {
	return version.replace(LEADING_V, "");
}

const PLATFORM_OS: Record<string, ReleasePlatform["os"]> = {
	darwin: "darwin",
	linux: "linux",
	win32: "windows",
};

export function detectPlatform(
	platform: string,
	arch: string
): Result<ReleasePlatform, UpgradeUnsupportedPlatformError> {
	const found = RELEASE_PLATFORMS.find(
		(candidate) =>
			candidate.os === PLATFORM_OS[platform] && candidate.arch === arch
	);
	return found
		? Result.ok(found)
		: Result.err(new UpgradeUnsupportedPlatformError({ os: platform, arch }));
}

export async function fetchLatestVersion(
	fetchFn: Fetch
): Promise<Result<string, UpgradeDownloadError>> {
	return await Result.tryPromise({
		try: async () => {
			const response = await fetchFn(LATEST_RELEASE_API, {
				headers: { Accept: "application/vnd.github+json" },
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return stripLeadingV(
				LatestReleaseSchema.parse(await response.json()).tag_name
			);
		},
		catch: (error) =>
			new UpgradeDownloadError({
				url: LATEST_RELEASE_API,
				detail: toMessage(error),
			}),
	});
}

/** The newest published release, release candidates included. */
export async function fetchNewestVersion(
	fetchFn: Fetch
): Promise<Result<string, UpgradeDownloadError>> {
	return await Result.tryPromise({
		try: async () => {
			const response = await fetchFn(RELEASES_API, {
				headers: { Accept: "application/vnd.github+json" },
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const versions = ReleaseListSchema.parse(await response.json())
				.filter((release) => !release.draft)
				.map((release) => stripLeadingV(release.tag_name))
				.filter((version) => semver.valid(version));
			const newest = versions.sort(semver.rcompare)[0];
			if (!newest) throw new Error("no releases found");
			return newest;
		},
		catch: (error) =>
			new UpgradeDownloadError({ url: RELEASES_API, detail: toMessage(error) }),
	});
}

/** Parses `sha256sum` output into a map of asset name to lowercase hex digest. */
export function parseChecksums(text: string): Map<string, string> {
	const sums = new Map<string, string>();
	for (const line of text.split(NEWLINE)) {
		const match = CHECKSUM_LINE.exec(line.trim());
		if (match) sums.set(match[2] as string, match[1] as string);
	}
	return sums;
}

export async function sha256File(path: string): Promise<string> {
	const hasher = new Bun.CryptoHasher("sha256");
	for await (const chunk of createReadStream(path)) hasher.update(chunk);
	return hasher.digest("hex");
}

async function fetchOk(fetchFn: Fetch, url: string): Promise<Response> {
	const response = await fetchFn(url);
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return response;
}

/** Downloads a release asset to `dest` and checks it against the release's SHA256SUMS. */
export async function downloadVerified(options: {
	fetch: Fetch;
	version: string;
	asset: string;
	dest: string;
}): Promise<Result<void, UpgradeDownloadError | UpgradeIntegrityError>> {
	const { fetch: fetchFn, version, asset, dest } = options;
	const sumsUrl = releaseAssetUrl(version, RELEASE_CHECKSUMS_FILE);
	const assetUrl = releaseAssetUrl(version, asset);

	const sums = await Result.tryPromise({
		try: async () =>
			parseChecksums(await (await fetchOk(fetchFn, sumsUrl)).text()),
		catch: (error) =>
			new UpgradeDownloadError({ url: sumsUrl, detail: toMessage(error) }),
	});
	if (sums.isErr()) return Result.err(sums.error);

	const expected = sums.value.get(asset);
	if (!expected)
		return Result.err(
			new UpgradeIntegrityError({
				asset,
				detail: `${RELEASE_CHECKSUMS_FILE} has no entry for it`,
			})
		);

	const written = await Result.tryPromise({
		try: async () => {
			await Bun.write(dest, await fetchOk(fetchFn, assetUrl));
		},
		catch: (error) =>
			new UpgradeDownloadError({ url: assetUrl, detail: toMessage(error) }),
	});
	if (written.isErr()) return Result.err(written.error);

	const actual = await sha256File(dest);
	if (actual !== expected)
		return Result.err(
			new UpgradeIntegrityError({
				asset,
				detail: `checksum mismatch (expected ${expected}, got ${actual})`,
			})
		);
	return Result.ok();
}
