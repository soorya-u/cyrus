import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { type GitError, operationFailedError } from "@cyrus/errors/git";
import { Result } from "better-result";
import type { Repository, Worktree } from "es-git";
import {
	openGitRepository,
	operationFailedFromUnknown,
	runGitOperationAsync,
} from "./open";
import {
	defaultWorktreePath,
	resolveValidatedWorktreePath,
	worktreeNameForBranch,
} from "./paths";

function findWorktreeByPath(
	repo: Repository,
	worktreePath: string
): Worktree | null {
	const target = resolve(worktreePath);
	for (const name of repo.worktrees()) {
		const worktree = repo.findWorktree(name);
		if (resolve(worktree.path()) === target) return worktree;
	}
	return null;
}

export async function createGitWorktree(
	projectCwd: string,
	refName: string,
	path?: string
): Promise<Result<string, GitError>> {
	const opened = await openGitRepository(projectCwd);
	if (opened.isErr()) return Result.err(opened.error);

	const resolvedPath = path
		? resolveValidatedWorktreePath(projectCwd, path)
		: Result.ok(undefined);
	if (resolvedPath.isErr()) return Result.err(resolvedPath.error);

	const worktreePath =
		resolvedPath.value ?? defaultWorktreePath(projectCwd, refName);
	const prepared = await runGitOperationAsync(() =>
		mkdir(dirname(worktreePath), { recursive: true })
	);
	if (prepared.isErr()) return Result.err(prepared.error);

	const created = Result.try(() => {
		const name = worktreeNameForBranch(refName);
		opened.value.worktree(name, worktreePath, {
			refName: `refs/heads/${refName}`,
			checkoutExisting: true,
		});
		return worktreePath;
	});
	if (created.isErr())
		return Result.err(operationFailedFromUnknown(created.error));

	return Result.ok(created.value);
}

export async function removeGitWorktree(
	projectCwd: string,
	worktreePath: string
): Promise<Result<void, GitError>> {
	const opened = await openGitRepository(projectCwd);
	if (opened.isErr()) return Result.err(opened.error);

	const worktree = findWorktreeByPath(opened.value, worktreePath);
	if (!worktree) {
		return Result.err(operationFailedError("Worktree not found", worktreePath));
	}

	const removed = Result.try(() => {
		worktree.prune({ valid: true, locked: true, workingTree: true });
	});
	if (removed.isErr()) {
		return Result.err(operationFailedFromUnknown(removed.error));
	}
	return Result.ok(undefined);
}
