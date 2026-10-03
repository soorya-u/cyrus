import { describe, expect, test } from "vitest";
import {
	MIN_PEER_VERSION,
	meetsMinimumVersion,
	RELEASE_VERSION,
} from "./version";

const CORE_VERSION = /^\d+\.\d+\.\d+/;

describe("RELEASE_VERSION", () => {
	test("is read from the repo root package.json", () => {
		expect(RELEASE_VERSION).toMatch(CORE_VERSION);
	});

	test("meets every peer minimum", () => {
		expect(meetsMinimumVersion(RELEASE_VERSION, MIN_PEER_VERSION.worker)).toBe(
			true
		);
		expect(
			meetsMinimumVersion(RELEASE_VERSION, MIN_PEER_VERSION.controller)
		).toBe(true);
	});
});

describe("meetsMinimumVersion", () => {
	test("compares major, minor and patch numerically", () => {
		expect(meetsMinimumVersion("0.1.0", "0.1.0")).toBe(true);
		expect(meetsMinimumVersion("0.10.0", "0.9.9")).toBe(true);
		expect(meetsMinimumVersion("1.0.0", "0.99.99")).toBe(true);
		expect(meetsMinimumVersion("0.1.9", "0.2.0")).toBe(false);
		expect(meetsMinimumVersion("0.0.9", "0.1.0")).toBe(false);
	});

	test("ignores a prerelease suffix on either side", () => {
		expect(meetsMinimumVersion("0.1.0-rc.1", "0.1.0")).toBe(true);
		expect(meetsMinimumVersion("0.1.0", "0.1.0-rc.1")).toBe(true);
		expect(meetsMinimumVersion("0.0.9-rc.1", "0.1.0")).toBe(false);
	});

	test("rejects a version that is not major.minor.patch", () => {
		expect(meetsMinimumVersion("latest", "0.1.0")).toBe(false);
		expect(meetsMinimumVersion("0.1.0", "x")).toBe(false);
	});
});
