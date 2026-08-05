import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitBranchCheckedOutError } from "@cyrus/errors/git";
import { initRepository, openRepository } from "es-git";
import { checkoutGitRef } from "@/git/checkout";
import { getGitPatch } from "@/git/patch";
import { defaultWorktreePath, sanitizeBranchDirName } from "@/git/paths";
import { getGitStatus } from "@/git/status";
import { createGitWorktree } from "@/git/worktree";

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

describe("createGitWorktree", () => {
	test("forks a new branch instead of the checked-out source branch", async () => {
		const dir = await mkdtemp(join(tmpdir(), "cyrus-git-"));
		try {
			await initRepo(dir);
			const result = await createGitWorktree(dir, "main", "wt-main");
			expect(result.isOk()).toBe(true);
			if (!result.isOk()) return;

			const worktreeRepo = await openRepository(result.value);
			expect(worktreeRepo.head().shorthand()).not.toBe("main");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("succeeds even when the source branch is checked out in the main repo", async () => {
		const dir = await mkdtemp(join(tmpdir(), "cyrus-git-"));
		try {
			await initRepo(dir);
			const first = await createGitWorktree(dir, "main", "wt-a");
			const second = await createGitWorktree(dir, "main", "wt-b");
			expect(first.isOk()).toBe(true);
			expect(second.isOk()).toBe(true);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});

describe("checkoutGitRef", () => {
	test("succeeds as a no-op when already on the requested branch", async () => {
		const dir = await mkdtemp(join(tmpdir(), "cyrus-git-"));
		try {
			await initRepo(dir);
			const result = await checkoutGitRef(dir, "main");
			expect(result.isOk()).toBe(true);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("returns branchAlreadyCheckedOutError when the branch is checked out in another worktree", async () => {
		const dir = await mkdtemp(join(tmpdir(), "cyrus-git-"));
		try {
			await initRepo(dir);
			const repo = await openRepository(dir);
			const head = repo.head();
			const oid = head.target();
			if (!oid) throw new Error("expected HEAD to resolve to a commit");
			const commit = repo.getCommit(oid);
			repo.createBranch("feature", commit);
			repo.worktree("feature", join(dir, "wt-feature"), {
				refName: "refs/heads/feature",
				checkoutExisting: true,
			});

			const result = await checkoutGitRef(dir, "feature");
			expect(result.isErr()).toBe(true);
			if (!result.isErr()) return;
			expect(GitBranchCheckedOutError.is(result.error)).toBe(true);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
