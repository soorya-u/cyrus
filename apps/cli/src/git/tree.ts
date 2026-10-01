import { readdir } from "node:fs/promises";
import { posix } from "node:path";
import type { GitError } from "@cyrus/errors/git";
import type { GitDirectoryEntry } from "@cyrus/schemas/rtc/git";
import { Result } from "better-result";
import { resolveWithinCwd } from "./contain";
import { openGitRepository, operationFailedFromUnknown } from "./open";

const GIT_DIR = ".git";
const TRAILING_SLASHES = /\/+$/;

/** Lists one directory level under `directoryPath`, omitting `.git` and ignored paths. */
export async function listGitDirectory(
	cwd: string,
	directoryPath: string
): Promise<Result<GitDirectoryEntry[], GitError>> {
	const opened = await openGitRepository(cwd);
	if (opened.isErr()) return Result.err(opened.error);

	const resolved = await resolveWithinCwd(cwd, directoryPath);
	if (resolved.isErr()) return Result.err(resolved.error);

	const dirents = await Result.tryPromise(() =>
		readdir(resolved.value, { withFileTypes: true })
	);
	if (dirents.isErr()) {
		return Result.err(operationFailedFromUnknown(dirents.error));
	}

	const normalized = posix.normalize(directoryPath);
	const base =
		normalized === "." ? "" : normalized.replace(TRAILING_SLASHES, "");
	const repo = opened.value;
	const index = repo.index();
	const entries: GitDirectoryEntry[] = [];
	for (const dirent of dirents.value) {
		if (dirent.name === GIT_DIR) continue;
		const path = base ? `${base}/${dirent.name}` : dirent.name;
		const kind = dirent.isDirectory() ? "directory" : "file";
		// Ignore rules never hide a file git already tracks.
		const tracked = kind === "file" && index.getByPath(path) !== null;
		const ignored = repo.isPathIgnored(
			kind === "directory" ? `${path}/` : path
		);
		if (ignored && !tracked) continue;
		entries.push({ path, kind });
	}

	entries.sort((left, right) => {
		if (left.kind !== right.kind) return left.kind === "directory" ? -1 : 1;
		const a = left.path.toLowerCase();
		const b = right.path.toLowerCase();
		if (a !== b) return a < b ? -1 : 1;
		return left.path < right.path ? -1 : 1;
	});
	return Result.ok(entries);
}
