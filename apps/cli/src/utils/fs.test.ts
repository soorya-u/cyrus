import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listFiles, searchFiles } from "./fs";

async function initGitRepo(cwd: string): Promise<void> {
	const exitCode = await Bun.spawn(["git", "init"], {
		cwd,
		stdout: "ignore",
		stderr: "ignore",
	}).exited;
	if (exitCode !== 0) throw new Error("git init failed");
}

describe("listFiles", () => {
	test("skips gitignored paths via FileFinder", async () => {
		const root = await mkdtemp(join(tmpdir(), "cyrus-list-files-"));
		await initGitRepo(root);
		await writeFile(join(root, ".gitignore"), "ignored/\n");
		await mkdir(join(root, "src"));
		await writeFile(join(root, "src/index.ts"), "export {};\n");
		await mkdir(join(root, "ignored"));
		await writeFile(join(root, "ignored/secret.ts"), "secret\n");

		const files = await listFiles(root, 3);
		expect(files).toEqual(["src/index.ts"]);
	});

	test("respects depth limit", async () => {
		const root = await mkdtemp(join(tmpdir(), "cyrus-list-files-depth-"));
		await initGitRepo(root);
		await mkdir(join(root, "a/b"), { recursive: true });
		await writeFile(join(root, "root.ts"), "export {};\n");
		await writeFile(join(root, "a/mid.ts"), "export {};\n");
		await writeFile(join(root, "a/b/deep.ts"), "export {};\n");

		const files = await listFiles(root, 2);
		expect(files).toEqual(["a/mid.ts", "root.ts"]);
	});
});

describe("searchFiles", () => {
	test("fuzzy-searches files beyond depth limits", async () => {
		const root = await mkdtemp(join(tmpdir(), "cyrus-search-files-"));
		await initGitRepo(root);
		await mkdir(join(root, "a/b"), { recursive: true });
		await writeFile(join(root, "root.ts"), "export {};\n");
		await writeFile(join(root, "a/mid.ts"), "export {};\n");
		await writeFile(join(root, "a/b/deep.ts"), "export {};\n");

		const result = await searchFiles(root, "deep", 20);
		expect(result.entries.some((entry) => entry.path === "a/b/deep.ts")).toBe(
			true
		);
	});

	test("lists files when query ends with a directory slash", async () => {
		const root = await mkdtemp(join(tmpdir(), "cyrus-search-dir-"));
		await initGitRepo(root);
		await mkdir(join(root, "apps/web/src"), { recursive: true });
		await writeFile(join(root, "apps/web/package.json"), "{}\n");
		await writeFile(join(root, "apps/web/src/index.tsx"), "export {};\n");

		const result = await searchFiles(root, "web/", 20);
		const paths = result.entries.map((entry) => entry.path);
		expect(paths).toContain("apps/web/package.json");
		expect(paths).toContain("apps/web/src/index.tsx");
	});
});
