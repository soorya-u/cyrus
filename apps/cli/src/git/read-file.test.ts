import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitPathOutsideCwdError } from "@cyrus/errors/git";
import { MAX_PREVIEW_BYTES, readGitFile } from "@/git/read-file";

async function withDir(run: (dir: string) => Promise<void>) {
	const dir = await mkdtemp(join(tmpdir(), "cyrus-read-"));
	try {
		await run(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

describe("readGitFile", () => {
	test("returns text contents for a nested file", async () => {
		await withDir(async (dir) => {
			await mkdir(join(dir, "src"));
			await writeFile(join(dir, "src", "a.ts"), "export const a = 1;\n");

			const result = await readGitFile(dir, "src/a.ts");
			expect(result.isOk()).toBe(true);
			if (!result.isOk()) return;
			expect(result.value).toEqual({
				kind: "text",
				contents: "export const a = 1;\n",
			});
		});
	});

	test("reports binary files as unpreviewable", async () => {
		await withDir(async (dir) => {
			await writeFile(
				join(dir, "blob.bin"),
				Buffer.from([0x89, 0x50, 0, 0x47])
			);

			const result = await readGitFile(dir, "blob.bin");
			expect(result.isOk()).toBe(true);
			if (!result.isOk()) return;
			expect(result.value).toEqual({ kind: "unpreviewable", reason: "binary" });
		});
	});

	test("reports oversized files as unpreviewable without reading them", async () => {
		await withDir(async (dir) => {
			await writeFile(join(dir, "big.txt"), "a".repeat(MAX_PREVIEW_BYTES + 1));

			const result = await readGitFile(dir, "big.txt");
			expect(result.isOk()).toBe(true);
			if (!result.isOk()) return;
			expect(result.value).toEqual({
				kind: "unpreviewable",
				reason: "too_large",
			});
		});
	});

	test("rejects paths and symlinks that escape the effective cwd", async () => {
		await withDir(async (dir) => {
			const outside = await mkdtemp(join(tmpdir(), "cyrus-outside-"));
			try {
				await writeFile(join(outside, "secret.txt"), "secret");
				await symlink(join(outside, "secret.txt"), join(dir, "link.txt"));

				for (const escaping of ["../x", "/etc/passwd", "link.txt"]) {
					const result = await readGitFile(dir, escaping);
					expect(result.isErr()).toBe(true);
					if (!result.isErr()) return;
					expect(GitPathOutsideCwdError.is(result.error)).toBe(true);
				}
			} finally {
				await rm(outside, { recursive: true, force: true });
			}
		});
	});

	test("refuses to read inside .git", async () => {
		await withDir(async (dir) => {
			await mkdir(join(dir, ".git"));
			await writeFile(join(dir, ".git", "config"), "[remote]");
			expect((await readGitFile(dir, ".git/config")).isErr()).toBe(true);
		});
	});

	test("fails for a directory and for a missing file", async () => {
		await withDir(async (dir) => {
			await mkdir(join(dir, "src"));
			expect((await readGitFile(dir, "src")).isErr()).toBe(true);
			expect((await readGitFile(dir, "nope.ts")).isErr()).toBe(true);
		});
	});
});
