import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { GitError } from "@cyrus/errors/git";
import type { GitFileStatus } from "@cyrus/schemas/rtc/git";
import { Result } from "better-result";
import { structuredPatch } from "diff";
import type { Repository, Tree } from "es-git";
import { WORKING_TREE_DIFF_OPTIONS } from "./diff-options";
import { operationFailedFromUnknown } from "./open";

const FILE_STATUSES = new Set<GitFileStatus>([
	"Added",
	"Deleted",
	"Modified",
	"Renamed",
	"Untracked",
]);
const ABSENT_OID = /^0+$/;
const BINARY_SNIFF_BYTES = 8000;
const MAX_DIFF_BYTES = 1024 * 1024;
const DEV_NULL = "/dev/null";

export type WorkingTreeFile = {
	path: string;
	status: GitFileStatus;
	patch: string;
	insertions: number;
	deletions: number;
};

function mapFileStatus(status: string): GitFileStatus {
	if (FILE_STATUSES.has(status as GitFileStatus)) {
		return status as GitFileStatus;
	}
	return "Modified";
}

function isUndiffable(bytes: Uint8Array): boolean {
	return (
		bytes.length > MAX_DIFF_BYTES ||
		bytes.subarray(0, BINARY_SNIFF_BYTES).includes(0)
	);
}

// git writes an empty range's start as the line before it; jsdiff reports the
// line where the text would sit.
function hunkRange(start: number, lines: number): string {
	if (lines === 0) return `${Math.max(0, start - 1)},0`;
	return lines === 1 ? `${start}` : `${start},${lines}`;
}

async function readWorkingFile(cwd: string, path: string): Promise<Uint8Array> {
	const read = await Result.tryPromise(() => readFile(join(cwd, path)));
	return read.isOk() ? read.value : new Uint8Array();
}

function readHeadBlob(repo: Repository, oid: string): Uint8Array {
	if (ABSENT_OID.test(oid)) return new Uint8Array();
	const blob = Result.try(() => repo.getObject(oid).peelToBlob().content());
	return blob.isOk() ? blob.value : new Uint8Array();
}

function describeFile(
	oldPath: string,
	newPath: string,
	status: GitFileStatus,
	oldBytes: Uint8Array,
	newBytes: Uint8Array
): Omit<WorkingTreeFile, "path" | "status"> {
	const isNew = status === "Added" || status === "Untracked";
	const isDeleted = status === "Deleted";
	const oldLabel = isNew ? DEV_NULL : `a/${oldPath}`;
	const newLabel = isDeleted ? DEV_NULL : `b/${newPath}`;

	const header = [`diff --git a/${oldPath} b/${newPath}`];
	if (isNew) header.push("new file mode 100644");
	if (isDeleted) header.push("deleted file mode 100644");
	if (status === "Renamed" && oldPath !== newPath) {
		header.push(`rename from ${oldPath}`, `rename to ${newPath}`);
	}

	if (isUndiffable(oldBytes) || isUndiffable(newBytes)) {
		header.push(`Binary files ${oldLabel} and ${newLabel} differ`);
		return { patch: `${header.join("\n")}\n`, insertions: 0, deletions: 0 };
	}

	const { hunks } = structuredPatch(
		oldPath,
		newPath,
		Buffer.from(oldBytes).toString("utf8"),
		Buffer.from(newBytes).toString("utf8"),
		"",
		"",
		{ context: 3 }
	);
	if (hunks.length === 0) {
		return { patch: `${header.join("\n")}\n`, insertions: 0, deletions: 0 };
	}

	header.push(`--- ${oldLabel}`, `+++ ${newLabel}`);
	let insertions = 0;
	let deletions = 0;
	const body: string[] = [];
	for (const hunk of hunks) {
		body.push(
			`@@ -${hunkRange(hunk.oldStart, hunk.oldLines)} +${hunkRange(hunk.newStart, hunk.newLines)} @@`,
			...hunk.lines
		);
		for (const line of hunk.lines) {
			if (line.startsWith("+")) insertions++;
			else if (line.startsWith("-")) deletions++;
		}
	}
	return {
		patch: `${[...header, ...body].join("\n")}\n`,
		insertions,
		deletions,
	};
}

/** Per-file unified patches and line counts for the working tree against HEAD. */
export async function buildWorkingTreeFiles(
	cwd: string,
	repo: Repository,
	headTree: Tree,
	pathspec?: string
): Promise<Result<WorkingTreeFile[], GitError>> {
	const diff = Result.try(() => {
		const built = repo.diffTreeToWorkdirWithIndex(headTree, {
			...WORKING_TREE_DIFF_OPTIONS,
			...(pathspec ? { pathspecs: [pathspec] } : {}),
		});
		built.findSimilar({ renames: true });
		return built;
	});
	if (diff.isErr()) return Result.err(operationFailedFromUnknown(diff.error));

	const files: WorkingTreeFile[] = [];
	for (const delta of diff.value.deltas()) {
		const oldPath = delta.oldFile().path() ?? delta.newFile().path();
		const newPath = delta.newFile().path() ?? oldPath;
		if (!(oldPath && newPath)) continue;

		const status = mapFileStatus(delta.status());
		const oldBytes =
			status === "Added" || status === "Untracked"
				? new Uint8Array()
				: readHeadBlob(repo, delta.oldFile().id());
		const newBytes =
			status === "Deleted"
				? new Uint8Array()
				: await readWorkingFile(cwd, newPath);

		files.push({
			path: newPath,
			status,
			...describeFile(oldPath, newPath, status, oldBytes, newBytes),
		});
	}
	return Result.ok(files);
}
