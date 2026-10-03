import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tempCyrusHomeFixture } from "@cyrus/test/fixtures/cyrus-home";
import { classifyInstall, reportedVersion, swapBinary } from "./install";

const tempDir = tempCyrusHomeFixture(afterEach, "cyrus-install-");

describe("classifyInstall", () => {
	const installBin = "/home/u/.cyrus/bin/cyrusd";

	test("only the installer's path is managed", () => {
		expect(classifyInstall(installBin, installBin)).toBe("managed");
	});

	test("recognises an npm install by its node_modules path", () => {
		expect(
			classifyInstall(
				"/usr/lib/node_modules/@soorya-u/cyrusd-linux-x64/cyrusd",
				installBin
			)
		).toBe("npm");
	});

	test("treats everything else, including running from source, as other", () => {
		expect(classifyInstall("/usr/local/bin/bun", installBin)).toBe("other");
		expect(classifyInstall("/opt/cyrusd", installBin)).toBe("other");
	});
});

describe("swapBinary", () => {
	test("replaces the current binary with the staged one", async () => {
		const dir = await tempDir();
		const current = join(dir, "cyrusd");
		const next = join(dir, "cyrusd.new");
		await writeFile(current, "old");
		await writeFile(next, "new");

		expect((await swapBinary(current, next, "linux")).isOk()).toBe(true);
		expect(await readFile(current, "utf8")).toBe("new");
		await expect(stat(next)).rejects.toThrow();
	});

	test("on windows renames the running binary aside first", async () => {
		const dir = await tempDir();
		const current = join(dir, "cyrusd.exe");
		const next = join(dir, "cyrusd.exe.new");
		await writeFile(current, "old");
		await writeFile(next, "new");

		expect((await swapBinary(current, next, "windows")).isOk()).toBe(true);
		expect(await readFile(current, "utf8")).toBe("new");
		expect(await readFile(`${current}.old`, "utf8")).toBe("old");
	});

	test("on windows restores the old binary if the new one cannot move in", async () => {
		const dir = await tempDir();
		const current = join(dir, "cyrusd.exe");
		await writeFile(current, "old");

		const result = await swapBinary(current, join(dir, "missing"), "windows");
		expect(result.isErr() && result.error._tag).toBe("upgrade.swap");
		expect(await readFile(current, "utf8")).toBe("old");
	});
});

describe("reportedVersion", () => {
	test("returns what the binary prints for --version", async () => {
		const dir = await tempDir();
		await mkdir(dir, { recursive: true });
		const file = join(dir, "fake");
		await writeFile(file, "#!/bin/sh\necho 1.2.3\n", { mode: 0o755 });
		expect((await reportedVersion(file)).unwrap()).toBe("1.2.3");
	});

	test("fails when the file does not run", async () => {
		const dir = await tempDir();
		const file = join(dir, "broken");
		await writeFile(file, "not executable", { mode: 0o755 });
		const result = await reportedVersion(file);
		expect(result.isErr() && result.error._tag).toBe("upgrade.integrity");
	});
});
