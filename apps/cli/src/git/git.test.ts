import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initRepository } from "es-git";
import { getGitPatch } from "@/git/patch";
import { defaultWorktreePath, sanitizeBranchDirName } from "@/git/paths";
import { getGitStatus } from "@/git/status";

async function initRepo(dir: string) {
	const repo = await initRepository(dir, { initialHead: "main" });
	await writeFile(join(dir, "README.md"), "hello\n");
	const index = repo.index();
	index.addPath("README.md");
	index.write();
	const tree = repo.getTree(index.writeTree());
	const signature = { name: "Test", email: "test@example.com" };
	repo.commit(tree, "init", {
		author: signature,
		committer: signature,
		updateRef: "HEAD",
	});
}

describe("git paths", () => {
	test("sanitizes branch names for worktree dirs", () => {
		expect(sanitizeBranchDirName("feature/foo")).toBe("feature-foo");
	});

	test("builds default worktree path", () => {
		expect(defaultWorktreePath("/home/user/my-repo", "feature/x")).toBe(
			"/home/user/.my-repo-worktrees/feature-x"
		);
	});
});

describe("git status", () => {
	test("returns isRepo false outside git", async () => {
		const dir = await mkdtemp(join(tmpdir(), "cyrus-git-"));
		try {
			expect(await getGitStatus(dir)).toEqual({ isRepo: false });
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("reports modified files", async () => {
		const dir = await mkdtemp(join(tmpdir(), "cyrus-git-"));
		try {
			await initRepo(dir);
			await writeFile(join(dir, "README.md"), "hello\nworld\n");
			const status = await getGitStatus(dir);
			expect(status.isRepo).toBe(true);
			if (!status.isRepo) return;
			expect(status.refName).toBe("main");
			expect(status.files.some((file) => file.path === "README.md")).toBe(true);
			const patch = await getGitPatch(dir, "README.md");
			expect(patch.isOk()).toBe(true);
			if (!patch.isOk()) return;
			expect(patch.value).toContain("README.md");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
