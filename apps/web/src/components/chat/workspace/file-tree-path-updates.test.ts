import { describe, expect, test } from "vitest";
import { buildFileTreePathUpdates } from "./file-tree-path-updates";

describe("buildFileTreePathUpdates", () => {
	test("adds new paths, shallowest first", () => {
		expect(
			buildFileTreePathUpdates(["a.ts"], ["a.ts", "src/x/y.ts", "src/"])
		).toEqual([
			{ type: "add", path: "src/" },
			{ type: "add", path: "src/x/y.ts" },
		]);
	});

	test("removes a vanished directory recursively and skips its descendants", () => {
		expect(
			buildFileTreePathUpdates(["src/", "src/a.ts", "keep.ts"], ["keep.ts"])
		).toEqual([{ type: "remove", path: "src/", recursive: true }]);
	});

	test("removes a vanished file without recursion", () => {
		expect(buildFileTreePathUpdates(["a.ts", "b.ts"], ["a.ts"])).toEqual([
			{ type: "remove", path: "b.ts" },
		]);
	});

	test("returns nothing when paths are unchanged", () => {
		expect(buildFileTreePathUpdates(["a.ts", "d/"], ["d/", "a.ts"])).toEqual(
			[]
		);
	});
});
