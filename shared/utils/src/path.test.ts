import { describe, expect, test } from "bun:test";
import {
	appendBrowsePathSegment,
	canNavigateUp,
	ensureBrowseDirectoryPath,
	getBrowseParentPath,
	inferProjectTitleFromPath,
	isFilesystemBrowseQuery,
	isUnsupportedWindowsProjectPath,
	joinBrowseEntryPath,
	normalizeProjectPathForDispatch,
	resolveProjectPathForDispatch,
} from "./path";

describe("project path helpers", () => {
	test("normalizes whitespace and trailing separators", () => {
		expect(normalizeProjectPathForDispatch(" /tmp/cyrus/// ")).toBe(
			"/tmp/cyrus"
		);
		expect(normalizeProjectPathForDispatch("C:\\Users\\soorya\\\\")).toBe(
			"C:\\Users\\soorya"
		);
	});

	test("resolves explicit relative paths against an absolute cwd", () => {
		expect(resolveProjectPathForDispatch("../other", "/home/me/cyrus")).toBe(
			"/home/me/other"
		);
		expect(resolveProjectPathForDispatch("./apps/web", "/home/me/cyrus")).toBe(
			"/home/me/cyrus/apps/web"
		);
	});

	test("detects filesystem browse queries by platform", () => {
		expect(isFilesystemBrowseQuery("~/code")).toBe(true);
		expect(isFilesystemBrowseQuery("C:\\Users\\me", "linux")).toBe(false);
		expect(isFilesystemBrowseQuery("C:\\Users\\me", "win32")).toBe(true);
		expect(isUnsupportedWindowsProjectPath("C:\\Users\\me", "linux")).toBe(
			true
		);
	});

	test("infers project titles from unix and windows paths", () => {
		expect(inferProjectTitleFromPath("/home/me/cyrus/")).toBe("cyrus");
		expect(inferProjectTitleFromPath("C:\\Users\\me\\cyrus\\")).toBe("cyrus");
	});

	test("builds browse paths and parents", () => {
		expect(ensureBrowseDirectoryPath("/home/me")).toBe("/home/me/");
		expect(appendBrowsePathSegment("/home/me/", "cyrus")).toBe(
			"/home/me/cyrus/"
		);
		expect(joinBrowseEntryPath("/home/me", "cyrus")).toBe("/home/me/cyrus");
		expect(getBrowseParentPath("/home/me/cyrus/")).toBe("/home/me/");
		expect(canNavigateUp("/home/me/cyrus/")).toBe(true);
		expect(canNavigateUp("/")).toBe(false);
	});
});
