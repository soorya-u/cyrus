import { resolve } from "node:path";
import {
	branchAlreadyCheckedOutError,
	type GitError,
	GitNotRepositoryError,
} from "@cyrus/errors/git";
import { Result } from "better-result";
import { openRepositoryFromWorktree, type Repository } from "es-git";
import { openGitRepository, operationFailedFromUnknown } from "./open";

function currentBranchRefName(repo: Repository): string | null {
	return repo.findReference("HEAD")?.symbolicTarget() ?? null;
}

function findBranchCheckedOutElsewhere(
	repo: Repository,
	branch: string,
	excludePath: string
): string | null {
	const target = `refs/heads/${branch}`;
	const exclude = resolve(excludePath);

	const workdir = repo.workdir();
	if (
		workdir &&
		resolve(workdir) !== exclude &&
		currentBranchRefName(repo) === target
	) {
		return workdir;
	}

	for (const name of repo.worktrees()) {
		const worktree = repo.findWorktree(name);
		const worktreePath = worktree.path();
		if (resolve(worktreePath) === exclude) continue;

		const worktreeRepo = Result.try(() => openRepositoryFromWorktree(worktree));
		if (worktreeRepo.isErr()) continue;

		if (currentBranchRefName(worktreeRepo.value) === target)
			return worktreePath;
	}

	return null;
}

export async function checkoutGitRef(
	cwd: string,
	refName: string
): Promise<Result<void, GitError>> {
	const opened = await openGitRepository(cwd);
	if (opened.isErr()) return Result.err(opened.error);

	const conflictPath = findBranchCheckedOutElsewhere(
		opened.value,
		refName,
		cwd
	);
	if (conflictPath)
		return Result.err(branchAlreadyCheckedOutError(refName, conflictPath));

	const checkout = Result.try(() => {
		opened.value.setHead(`refs/heads/${refName}`);
		opened.value.checkoutHead();
	});
	if (checkout.isErr())
		return Result.err(operationFailedFromUnknown(checkout.error));

	return Result.ok(undefined);
}

export async function tryCheckoutGitRef(
	cwd: string,
	refName: string
): Promise<Result<void, GitError>> {
	const result = await checkoutGitRef(cwd, refName);
	if (result.isErr() && GitNotRepositoryError.is(result.error)) {
		return Result.ok(undefined);
	}
	return result;
}
