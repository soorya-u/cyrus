import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { type GitError, operationFailedError } from "@cyrus/errors/git";
import { generateName } from "@cyrus/utils/identity";
import { Result } from "better-result";
import type { Commit, Repository, Worktree } from "es-git";
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

const MAX_BRANCH_NAME_ATTEMPTS = 5;

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

function resolveBranchCommit(
	repo: Repository,
	refName: string
): Result<Commit, GitError> {
	return Result.try(() => {
		const branch = repo.getBranch(refName, "Local");
		const oid = branch.referenceTarget();
		if (!oid) throw new Error(`Branch '${refName}' has no commits yet`);
		return repo.getCommit(oid);
	}).mapError(operationFailedFromUnknown);
}

function generateUniqueBranchName(repo: Repository): string {
	for (let attempt = 0; attempt < MAX_BRANCH_NAME_ATTEMPTS; attempt++) {
		const candidate = generateName();
		if (!repo.findBranch(candidate, "Local")) return candidate;
	}
	return `${generateName()}-${crypto.randomUUID().slice(0, 8)}`;
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

	const commit = resolveBranchCommit(opened.value, refName);
	if (commit.isErr()) return Result.err(commit.error);

	const branchName = generateUniqueBranchName(opened.value);
	const branch = Result.try(() =>
		opened.value.createBranch(branchName, commit.value)
	);
	if (branch.isErr())
		return Result.err(operationFailedFromUnknown(branch.error));

	const worktreePath =
		resolvedPath.value ?? defaultWorktreePath(projectCwd, branchName);
	const prepared = await runGitOperationAsync(() =>
		mkdir(dirname(worktreePath), { recursive: true })
	);
	if (prepared.isErr()) {
		Result.try(() => branch.value.delete());
		return Result.err(prepared.error);
	}

	const created = Result.try(() => {
		const name = worktreeNameForBranch(branchName);
		opened.value.worktree(name, worktreePath, {
			refName: `refs/heads/${branchName}`,
			checkoutExisting: true,
		});
		return worktreePath;
	});
	if (created.isErr()) {
		Result.try(() => branch.value.delete());
		return Result.err(operationFailedFromUnknown(created.error));
	}

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
