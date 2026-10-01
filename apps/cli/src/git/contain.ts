import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
	type GitError,
	operationFailedError,
	pathOutsideCwdError,
} from "@cyrus/errors/git";
import { Result } from "better-result";
import { operationFailedFromUnknown } from "./open";

const GIT_DIR = ".git";
const PATH_SEPARATORS = /[\\/]/;

/**
 * Resolves a cwd-relative path to its real absolute path, rejecting
 * anything (including symlink targets) that lands outside `cwd`.
 */
export async function resolveWithinCwd(
	cwd: string,
	relativePath: string
): Promise<Result<string, GitError>> {
	if (isAbsolute(relativePath)) {
		return Result.err(pathOutsideCwdError(relativePath));
	}

	if (relativePath.split(PATH_SEPARATORS).includes(GIT_DIR)) {
		return Result.err(
			operationFailedError(`'${relativePath}' is not browsable`)
		);
	}

	const root = await Result.tryPromise(() => realpath(cwd));
	if (root.isErr()) return Result.err(operationFailedFromUnknown(root.error));

	const lexical = resolve(root.value, relativePath);
	if (!isInside(root.value, lexical)) {
		return Result.err(pathOutsideCwdError(relativePath));
	}

	const real = await Result.tryPromise(() => realpath(lexical));
	if (real.isErr()) return Result.err(operationFailedFromUnknown(real.error));
	if (!isInside(root.value, real.value)) {
		return Result.err(pathOutsideCwdError(relativePath));
	}

	return Result.ok(real.value);
}

function isInside(root: string, target: string): boolean {
	const rel = relative(root, target);
	return (
		rel === "" ||
		!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
	);
}
