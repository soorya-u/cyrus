import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
	RELEASE_CHECKSUMS_FILE,
	RELEASE_PLATFORMS,
	RELEASE_REPO,
	releaseAssetName,
	releaseAssetUrl,
} from "./release";

const repoFile = (path: string) =>
	readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

describe("release asset naming", () => {
	test("names one raw binary per platform", () => {
		expect(
			RELEASE_PLATFORMS.map((p) => releaseAssetName(p.os, p.arch))
		).toEqual([
			"cyrusd-linux-x64",
			"cyrusd-linux-arm64",
			"cyrusd-darwin-x64",
			"cyrusd-darwin-arm64",
			"cyrusd-windows-x64.exe",
		]);
	});

	test("builds download URLs from the release tag", () => {
		expect(releaseAssetUrl("0.1.0", "cyrusd-linux-x64")).toBe(
			`https://github.com/${RELEASE_REPO}/releases/download/v0.1.0/cyrusd-linux-x64`
		);
	});
});

// The build matrix, the npm publisher and both installers each spell the
// contract out in their own language; these pin them to the constants above.
describe("release asset contract", () => {
	test("the build matrix publishes every platform's asset", () => {
		const workflow = repoFile(".github/workflows/release.yml");
		for (const { os, arch } of RELEASE_PLATFORMS)
			expect(workflow).toContain(`asset: ${releaseAssetName(os, arch)}`);
	});

	test("the npm publisher downloads every platform's asset", () => {
		const script = repoFile("scripts/ci/publish-npm.sh");
		for (const { os, arch } of RELEASE_PLATFORMS)
			expect(script).toContain(`"${releaseAssetName(os, arch)}|`);
	});

	test("install.sh resolves assets, checksums and repo the same way", () => {
		const script = repoFile("apps/web/public/install.sh");
		expect(script).toContain(`REPO="${RELEASE_REPO}"`);
		expect(script).toContain('asset="cyrusd-$os-$arch"');
		expect(script).toContain(RELEASE_CHECKSUMS_FILE);
	});

	test("install.ps1 resolves assets, checksums and repo the same way", () => {
		const script = repoFile("apps/web/public/install.ps1");
		expect(script).toContain(`$repo = "${RELEASE_REPO}"`);
		expect(script).toContain(
			`$asset = "${releaseAssetName("windows", "x64")}"`
		);
		expect(script).toContain(RELEASE_CHECKSUMS_FILE);
	});
});
