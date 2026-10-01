import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	GitNotRepositoryError,
	GitPathOutsideCwdError,
} from "@cyrus/errors/git";
import { initRepository, openRepository } from "es-git";
import { listGitDirectory } from "@/git/tree";

async function withRepo(run: (dir: string) => Promise<void>) {
	const dir = await mkdtemp(join(tmpdir(), "cyrus-tree-"));
	try {
		await initRepository(dir, { initialHead: "main" });
		await run(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

describe("listGitDirectory", () => {
	test("lists one level, directories first, with cwd-relative paths", async () => {
		await withRepo(async (dir) => {
			await mkdir(join(dir, "src"));
			await writeFile(join(dir, "src", "a.ts"), "a");
			await writeFile(join(dir, "README.md"), "hi");
			await writeFile(join(dir, "b.txt"), "b");

			const root = await listGitDirectory(dir, "");
			expect(root.isOk()).toBe(true);
			if (!root.isOk()) return;
			expect(root.value).toEqual([
				{ path: "src", kind: "directory" },
				{ path: "b.txt", kind: "file" },
				{ path: "README.md", kind: "file" },
			]);

			const nested = await listGitDirectory(dir, "src");
			expect(nested.isOk()).toBe(true);
			if (!nested.isOk()) return;
			expect(nested.value).toEqual([{ path: "src/a.ts", kind: "file" }]);
		});
	});

	test("omits .git and gitignored files and directories", async () => {
		await withRepo(async (dir) => {
			await writeFile(join(dir, ".gitignore"), "node_modules/\n*.log\n");
			await mkdir(join(dir, "node_modules"));
			await writeFile(join(dir, "node_modules", "x.js"), "x");
			await writeFile(join(dir, "debug.log"), "log");
			await writeFile(join(dir, "keep.ts"), "k");

			const root = await listGitDirectory(dir, "");
			expect(root.isOk()).toBe(true);
			if (!root.isOk()) return;
			expect(root.value.map((entry) => entry.path)).toEqual([
				".gitignore",
				"keep.ts",
			]);
		});
	});

	test("shows tracked files even when they match an ignore pattern", async () => {
		await withRepo(async (dir) => {
			await writeFile(join(dir, "kept.log"), "tracked");
			const repo = await openRepository(dir);
			const index = repo.index();
			index.addPath("kept.log");
			index.write();
			await writeFile(join(dir, ".gitignore"), "*.log\n");
			await writeFile(join(dir, "other.log"), "untracked");

			const root = await listGitDirectory(dir, "");
			expect(root.isOk()).toBe(true);
			if (!root.isOk()) return;
			expect(root.value.map((entry) => entry.path)).toContain("kept.log");
			expect(root.value.map((entry) => entry.path)).not.toContain("other.log");
		});
	});

	test("normalizes redundant segments in the requested directory", async () => {
		await withRepo(async (dir) => {
			await mkdir(join(dir, "src"));
			await writeFile(join(dir, "src", "a.ts"), "a");
			const result = await listGitDirectory(dir, "./src//");
			expect(result.isOk()).toBe(true);
			if (!result.isOk()) return;
			expect(result.value).toEqual([{ path: "src/a.ts", kind: "file" }]);
		});
	});

	test("rejects paths that escape the effective cwd", async () => {
		await withRepo(async (dir) => {
			for (const escaping of ["..", "../other", "/etc", "src/../../.."]) {
				const result = await listGitDirectory(dir, escaping);
				expect(result.isErr()).toBe(true);
				if (!result.isErr()) return;
				expect(GitPathOutsideCwdError.is(result.error)).toBe(true);
			}
		});
	});

	test("allows directory names that merely start with two dots", async () => {
		await withRepo(async (dir) => {
			await mkdir(join(dir, "..odd"));
			await writeFile(join(dir, "..odd", "a.ts"), "a");
			const result = await listGitDirectory(dir, "..odd");
			expect(result.isOk()).toBe(true);
			if (!result.isOk()) return;
			expect(result.value).toEqual([{ path: "..odd/a.ts", kind: "file" }]);
		});
	});

	test("rejects a symlink that points outside the effective cwd", async () => {
		await withRepo(async (dir) => {
			const outside = await mkdtemp(join(tmpdir(), "cyrus-outside-"));
			try {
				await symlink(outside, join(dir, "escape"));
				const result = await listGitDirectory(dir, "escape");
				expect(result.isErr()).toBe(true);
				if (!result.isErr()) return;
				expect(GitPathOutsideCwdError.is(result.error)).toBe(true);
			} finally {
				await rm(outside, { recursive: true, force: true });
			}
		});
	});

	test("returns a not-repository error outside git", async () => {
		const dir = await mkdtemp(join(tmpdir(), "cyrus-tree-"));
		try {
			const result = await listGitDirectory(dir, "");
			expect(result.isErr()).toBe(true);
			if (!result.isErr()) return;
			expect(GitNotRepositoryError.is(result.error)).toBe(true);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
