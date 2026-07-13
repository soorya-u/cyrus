import {
	basename,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
} from "node:path";
import type { GitError } from "@cyrus/errors/git";
import { operationFailedError } from "@cyrus/errors/git";
import { Result } from "better-result";

export function sanitizeBranchDirName(branch: string): string {
	return branch.replace(/\//g, "-").replace(/[^\w.-]+/g, "-");
}

export function defaultWorktreePath(
	projectCwd: string,
	branch: string
): string {
	const repoName = basename(projectCwd) || "repo";
	const parent = dirname(projectCwd);
	return join(parent, `.${repoName}-worktrees`, sanitizeBranchDirName(branch));
}

export function worktreeNameForBranch(branch: string): string {
	return sanitizeBranchDirName(branch);
}

export function resolveValidatedWorktreePath(
	projectCwd: string,
	path: string
): Result<string, GitError> {
	if (isAbsolute(path)) {
		return Result.err(
			operationFailedError(
				"Worktree path must be relative to the project directory"
			)
		);
	}

	const resolved = resolve(projectCwd, path);
	const relativePath = relative(resolve(projectCwd), resolved);
	if (relativePath.startsWith("..")) {
		return Result.err(
			operationFailedError(
				"Worktree path must not escape the project directory"
			)
		);
	}

	return Result.ok(resolved);
}
