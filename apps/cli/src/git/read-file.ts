import { open } from "node:fs/promises";
import { type GitError, operationFailedError } from "@cyrus/errors/git";
import type { GitReadFileOutput } from "@cyrus/schemas/rtc/git";
import { Result } from "better-result";
import { resolveWithinCwd } from "./contain";
import { operationFailedFromUnknown } from "./open";

export const MAX_PREVIEW_BYTES = 1024 * 1024;
const BINARY_SNIFF_BYTES = 8000;

/** Reads one file under the effective cwd for preview; binary and oversized files are not returned. */
export async function readGitFile(
	cwd: string,
	path: string
): Promise<Result<GitReadFileOutput, GitError>> {
	const resolved = await resolveWithinCwd(cwd, path);
	if (resolved.isErr()) return Result.err(resolved.error);

	// Stat and read through one handle so a file that grows or is swapped
	// after resolution cannot slip past the size cap.
	const read = await Result.tryPromise(async () => {
		const handle = await open(resolved.value, "r");
		try {
			const info = await handle.stat();
			if (!info.isFile()) return { notFile: true as const };
			const buffer = Buffer.alloc(MAX_PREVIEW_BYTES + 1);
			const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
			return { notFile: false as const, bytes: buffer.subarray(0, bytesRead) };
		} finally {
			await handle.close();
		}
	});
	if (read.isErr()) return Result.err(operationFailedFromUnknown(read.error));
	if (read.value.notFile) {
		return Result.err(operationFailedError(`'${path}' is not a file`));
	}
	const bytes = Result.ok(read.value.bytes);
	if (bytes.value.length > MAX_PREVIEW_BYTES) {
		return Result.ok({ kind: "unpreviewable", reason: "too_large" });
	}

	if (bytes.value.subarray(0, BINARY_SNIFF_BYTES).includes(0)) {
		return Result.ok({ kind: "unpreviewable", reason: "binary" });
	}
	return Result.ok({ kind: "text", contents: bytes.value.toString("utf8") });
}
