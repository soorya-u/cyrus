import { describe, expect, test } from "vitest";
import { splitPatchByFile } from "./split-patch";

const A = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1 +1 @@
-old
+new
`;
const NEW = `diff --git a/src/b b/c.ts b/src/b b/c.ts
new file mode 100644
--- /dev/null
+++ b/src/b b/c.ts
@@ -0,0 +1 @@
+x
`;
const RENAMED = `diff --git a/old.md b/new.md
rename from old.md
rename to new.md
`;

describe("splitPatchByFile", () => {
	test("maps each file's new path to its own patch text", () => {
		const files = splitPatchByFile(A + NEW + RENAMED);

		expect(files.get("src/a.ts")).toBe(A);
		expect(files.get("src/b b/c.ts")).toBe(NEW);
		expect(files.get("new.md")).toBe(RENAMED);
		expect(files.size).toBe(3);
	});

	test("returns nothing for an empty patch", () => {
		expect(splitPatchByFile("").size).toBe(0);
	});

	test("does not split on a content line that mentions diff --git", () => {
		const tricky = `diff --git a/x.md b/x.md
--- a/x.md
+++ b/x.md
@@ -0,0 +1 @@
+diff --git a/fake b/fake
`;
		const files = splitPatchByFile(tricky);

		expect([...files.keys()]).toEqual(["x.md"]);
	});
});
