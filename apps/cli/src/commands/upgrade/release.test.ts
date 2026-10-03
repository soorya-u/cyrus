import { describe, expect, test } from "bun:test";
import { detectPlatform, parseChecksums, stripLeadingV } from "./release";

const DIGEST = "a".repeat(64);

describe("parseChecksums", () => {
	test("reads sha256sum text and binary-mode lines", () => {
		const sums = parseChecksums(
			`${DIGEST}  cyrusd-linux-x64\n${"b".repeat(64)} *cyrusd-windows-x64.exe\r\nnot a checksum line\n`
		);
		expect(sums.get("cyrusd-linux-x64")).toBe(DIGEST);
		expect(sums.get("cyrusd-windows-x64.exe")).toBe("b".repeat(64));
		expect(sums.size).toBe(2);
	});
});

describe("detectPlatform", () => {
	test("maps Node platform names onto release platforms", () => {
		expect(detectPlatform("win32", "x64").unwrap()).toEqual({
			os: "windows",
			arch: "x64",
		});
		expect(detectPlatform("darwin", "arm64").unwrap()).toEqual({
			os: "darwin",
			arch: "arm64",
		});
	});

	test("rejects a platform with no published release", () => {
		const result = detectPlatform("win32", "arm64");
		expect(result.isErr() && result.error._tag).toBe(
			"upgrade.unsupported_platform"
		);
		expect(detectPlatform("freebsd", "x64").isErr()).toBe(true);
	});
});

describe("stripLeadingV", () => {
	test("drops only a leading v", () => {
		expect(stripLeadingV("v0.1.0")).toBe("0.1.0");
		expect(stripLeadingV("0.1.0")).toBe("0.1.0");
	});
});
