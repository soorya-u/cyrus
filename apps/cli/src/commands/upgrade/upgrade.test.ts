import { afterEach, describe, expect, test } from "bun:test";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	LATEST_RELEASE_API,
	RELEASE_CHECKSUMS_FILE,
	RELEASES_API,
	releaseAssetName,
	releaseAssetUrl,
} from "@cyrus/constants/release";
import { tempCyrusHomeFixture } from "@cyrus/test/fixtures/cyrus-home";
import type { Fetch } from "./release";
import { performUpgrade, type UpgradeDeps } from "./upgrade";

const tempDir = tempCyrusHomeFixture(afterEach, "cyrus-upgrade-");
const platform = { os: "linux", arch: "x64" } as const;
const ASSET = releaseAssetName(platform.os, platform.arch);

type FakeRelease = {
	latest: string;
	// published after `latest`, as GitHub lists prereleases only in the full list
	prerelease?: string;
	reports?: string;
	tamper?: boolean;
};

function script(version: string): string {
	return `#!/bin/sh\necho ${version}\n`;
}

function sha256(text: string): string {
	return new Bun.CryptoHasher("sha256").update(text).digest("hex");
}

/** A release server that publishes `version`'s binary, optionally lying about its checksum. */
function fakeFetch(release: FakeRelease, calls: string[] = []): Fetch {
	return ((input: string | URL | Request) => {
		const url = String(input);
		calls.push(url);
		if (url === LATEST_RELEASE_API)
			return Promise.resolve(Response.json({ tag_name: `v${release.latest}` }));
		if (url === RELEASES_API) {
			const tags = [release.prerelease, release.latest].filter(Boolean);
			return Promise.resolve(
				Response.json([
					...tags.map((tag) => ({ tag_name: `v${tag}`, draft: false })),
					{ tag_name: "v9.0.0", draft: true },
				])
			);
		}
		const binary = script(release.reports ?? release.latest);
		for (const version of [release.latest, release.prerelease ?? ""]) {
			if (url === releaseAssetUrl(version, RELEASE_CHECKSUMS_FILE)) {
				const digest = release.tamper
					? "0".repeat(64)
					: sha256(script(version));
				return Promise.resolve(new Response(`${digest}  ${ASSET}\n`));
			}
			if (url === releaseAssetUrl(version, ASSET))
				return Promise.resolve(
					new Response(release.reports ? binary : script(version))
				);
		}
		return Promise.resolve(new Response("not found", { status: 404 }));
	}) as Fetch;
}

async function setup(overrides: Partial<UpgradeDeps> = {}) {
	const dir = await tempDir();
	const installBin = join(dir, "cyrusd");
	await writeFile(installBin, script("0.1.0"), { mode: 0o755 });
	const deps: UpgradeDeps = {
		fetch: fakeFetch({ latest: "0.2.0" }),
		execPath: installBin,
		installBin,
		currentVersion: "0.1.0",
		platform,
		runningPid: () => Promise.resolve(null),
		withLock: (fn) => fn(),
		...overrides,
	};
	return { deps, installBin };
}

describe("performUpgrade", () => {
	test("installs the latest release over the managed binary", async () => {
		const { deps, installBin } = await setup();

		const outcome = (await performUpgrade({}, deps)).unwrap();

		expect(outcome).toEqual({ kind: "upgraded", from: "0.1.0", to: "0.2.0" });
		expect(await readFile(installBin, "utf8")).toBe(script("0.2.0"));
		await expect(stat(`${installBin}.new`)).rejects.toThrow();
	});

	test("does nothing when already on the latest release", async () => {
		const { deps, installBin } = await setup({
			fetch: fakeFetch({ latest: "0.1.0" }),
		});

		const outcome = (await performUpgrade({}, deps)).unwrap();

		expect(outcome).toEqual({ kind: "up-to-date", version: "0.1.0" });
		expect(await readFile(installBin, "utf8")).toBe(script("0.1.0"));
	});

	test("moves a prerelease onto the stable release of the same version", async () => {
		const { deps } = await setup({
			currentVersion: "0.2.0-rc.1",
			fetch: fakeFetch({ latest: "0.2.0" }),
		});

		expect((await performUpgrade({}, deps)).unwrap().kind).toBe("upgraded");
	});

	test("refuses while a worker is running and downloads nothing", async () => {
		const calls: string[] = [];
		const { deps, installBin } = await setup({
			fetch: fakeFetch({ latest: "0.2.0" }, calls),
			runningPid: () => Promise.resolve(4242),
		});

		const result = await performUpgrade({}, deps);

		expect(result.isErr() && result.error._tag).toBe("upgrade.worker_running");
		expect(result.isErr() && result.error.message).toContain("cyrusd stop");
		expect(calls).toEqual([]);
		expect(await readFile(installBin, "utf8")).toBe(script("0.1.0"));
	});

	test("never overwrites a binary the installer does not own", async () => {
		const { deps } = await setup({
			execPath: "/usr/lib/node_modules/@soorya-u/cyrusd-linux-x64/cyrusd",
		});

		const result = await performUpgrade({}, deps);

		expect(result.isErr() && result.error._tag).toBe(
			"upgrade.unmanaged_install"
		);
		expect(result.isErr() && result.error.message).toContain("npm install -g");
	});

	test("keeps the old binary when the checksum does not match", async () => {
		const { deps, installBin } = await setup({
			fetch: fakeFetch({ latest: "0.2.0", tamper: true }),
		});

		const result = await performUpgrade({}, deps);

		expect(result.isErr() && result.error._tag).toBe("upgrade.integrity");
		expect(await readFile(installBin, "utf8")).toBe(script("0.1.0"));
		await expect(stat(`${installBin}.new`)).rejects.toThrow();
	});

	test("keeps the old binary when the download reports another version", async () => {
		const { deps, installBin } = await setup({
			fetch: fakeFetch({ latest: "0.2.0", reports: "0.3.0" }),
		});

		const result = await performUpgrade({}, deps);

		expect(result.isErr() && result.error._tag).toBe("upgrade.integrity");
		expect(await readFile(installBin, "utf8")).toBe(script("0.1.0"));
	});

	test("follows only stable releases by default", async () => {
		const { deps, installBin } = await setup({
			fetch: fakeFetch({ latest: "0.2.0", prerelease: "0.3.0-rc.1" }),
		});

		const outcome = (await performUpgrade({}, deps)).unwrap();

		expect(outcome).toEqual({ kind: "upgraded", from: "0.1.0", to: "0.2.0" });
		expect(await readFile(installBin, "utf8")).toBe(script("0.2.0"));
	});

	test("--rc follows the newest release including release candidates", async () => {
		const { deps, installBin } = await setup({
			fetch: fakeFetch({ latest: "0.2.0", prerelease: "0.3.0-rc.1" }),
		});

		const outcome = (await performUpgrade({ rc: true }, deps)).unwrap();

		expect(outcome).toEqual({
			kind: "upgraded",
			from: "0.1.0",
			to: "0.3.0-rc.1",
		});
		expect(await readFile(installBin, "utf8")).toBe(script("0.3.0-rc.1"));
	});

	test("--rc ignores draft releases", async () => {
		const { deps } = await setup({ fetch: fakeFetch({ latest: "0.2.0" }) });

		const outcome = (await performUpgrade({ rc: true }, deps)).unwrap();

		expect(outcome).toEqual({ kind: "upgraded", from: "0.1.0", to: "0.2.0" });
	});

	test("never downgrades a newer build to an older release", async () => {
		const { deps, installBin } = await setup({
			currentVersion: "0.3.0",
			fetch: fakeFetch({ latest: "0.2.0", prerelease: "0.2.5-rc.1" }),
		});

		expect((await performUpgrade({}, deps)).unwrap().kind).toBe("up-to-date");
		expect((await performUpgrade({ rc: true }, deps)).unwrap().kind).toBe(
			"up-to-date"
		);
		expect(await readFile(installBin, "utf8")).toBe(script("0.1.0"));
	});
});
