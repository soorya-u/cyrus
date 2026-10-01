import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initRepository } from "es-git";
import parseDiff from "parse-diff";
import { getGitPatch } from "@/git/patch";

async function withRepo(run: (dir: string) => Promise<void>) {
	const dir = await mkdtemp(join(tmpdir(), "cyrus-patch-"));
	try {
		const repo = await initRepository(dir, { initialHead: "main" });
		await writeFile(join(dir, "README.md"), "hello\n");
		await writeFile(join(dir, "gone.txt"), "bye\nbye\n");
		await writeFile(join(dir, "blob.bin"), Buffer.from([0, 1, 2, 3]));
		const index = repo.index();
		for (const path of ["README.md", "gone.txt", "blob.bin"]) {
			index.addPath(path);
		}
		index.write();
		const signature = { name: "Test", email: "test@example.com" };
		repo.commit(repo.getTree(index.writeTree()), "init", {
			author: signature,
			committer: signature,
			updateRef: "HEAD",
		});
		await run(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function patchFor(dir: string, path?: string) {
	const result = await getGitPatch(dir, path);
	if (!result.isOk()) throw new Error("patch failed");
	return result.value;
}

describe("getGitPatch", () => {
	test("marks added and context lines so the patch is a valid unified diff", async () => {
		await withRepo(async (dir) => {
			await writeFile(join(dir, "README.md"), "hello\nworld\n");
			const patch = await patchFor(dir, "README.md");

			expect(patch).toContain("diff --git a/README.md b/README.md");
			expect(patch).toContain("@@ -1 +1,2 @@\n hello\n+world\n");
			const [file] = parseDiff(patch);
			expect(file?.additions).toBe(1);
			expect(file?.deletions).toBe(0);
		});
	});

	test("keeps carriage returns when a file switches from LF to CRLF", async () => {
		await withRepo(async (dir) => {
			await writeFile(join(dir, "README.md"), "hello\r\n");
			const patch = await patchFor(dir, "README.md");

			expect(patch).toContain("@@ -1 +1 @@\n-hello\n+hello\r\n");
		});
	});

	test("keeps carriage returns in context and changed lines of CRLF files", async () => {
		await withRepo(async (dir) => {
			await writeFile(join(dir, "gone.txt"), "bye\r\nbye\r\nmore\r\n");
			const { openRepository } = await import("es-git");
			const repo = await openRepository(dir);
			const index = repo.index();
			index.addPath("gone.txt");
			index.write();
			const signature = { name: "Test", email: "test@example.com" };
			const head = repo.head().target();
			if (!head) throw new Error("no head");
			repo.commit(repo.getTree(index.writeTree()), "crlf", {
				author: signature,
				committer: signature,
				updateRef: "HEAD",
				parents: [head],
			});
			await writeFile(join(dir, "gone.txt"), "bye\r\nBYE\r\nmore\r\n");

			const patch = await patchFor(dir, "gone.txt");
			expect(patch).toContain(
				"@@ -1,3 +1,3 @@\n bye\r\n-bye\r\n+BYE\r\n more\r\n"
			);
		});
	});

	test("renders an untracked file as a new file", async () => {
		await withRepo(async (dir) => {
			await writeFile(join(dir, "fresh.ts"), "a\nb\n");
			const patch = await patchFor(dir, "fresh.ts");

			expect(patch).toContain("new file mode");
			expect(patch).toContain("--- /dev/null");
			expect(patch).toContain("+++ b/fresh.ts");
			expect(patch).toContain("@@ -0,0 +1,2 @@\n+a\n+b\n");
		});
	});

	test("renders a deleted file with removed lines", async () => {
		await withRepo(async (dir) => {
			await rm(join(dir, "gone.txt"));
			const patch = await patchFor(dir, "gone.txt");

			expect(patch).toContain("deleted file mode");
			expect(patch).toContain("+++ /dev/null");
			expect(patch).toContain("@@ -1,2 +0,0 @@\n-bye\n-bye\n");
		});
	});

	test("does not diff binary files", async () => {
		await withRepo(async (dir) => {
			await writeFile(join(dir, "blob.bin"), Buffer.from([0, 9, 9, 9]));
			const patch = await patchFor(dir, "blob.bin");

			expect(patch).toContain("Binary files a/blob.bin and b/blob.bin differ");
			expect(patch).not.toContain("@@");
		});
	});

	test("without a path, includes every changed file", async () => {
		await withRepo(async (dir) => {
			await writeFile(join(dir, "README.md"), "hello\nworld\n");
			await writeFile(join(dir, "fresh.ts"), "a\n");
			const files = parseDiff(await patchFor(dir)).map((file) => file.to);

			expect(files.sort()).toEqual(["README.md", "fresh.ts"]);
		});
	});
});
