import { describe, expect, test } from "bun:test";
import { getAcpPlatform } from "./platform";

describe("getAcpPlatform", () => {
	test("returns a known platform slug for the current runtime", () => {
		const platform = getAcpPlatform();
		const known = new Set([
			"darwin-aarch64",
			"darwin-x86_64",
			"linux-aarch64",
			"linux-x86_64",
			"windows-aarch64",
			"windows-x86_64",
			"unknown",
		]);
		expect(known.has(platform)).toBe(true);
	});

	test("maps linux x64 to linux-x86_64", () => {
		if (process.platform === "linux" && process.arch === "x64") {
			expect(getAcpPlatform()).toBe("linux-x86_64");
		}
	});
});
