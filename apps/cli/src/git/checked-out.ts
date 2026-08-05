import { resolve } from "node:path";
import { Result } from "better-result";
import { openRepositoryFromWorktree, type Repository } from "es-git";

function currentBranchRefName(repo: Repository): string | null {
	return repo.findReference("HEAD")?.symbolicTarget() ?? null;
}

export function findBranchCheckedOutElsewhere(
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

		if (currentBranchRefName(worktreeRepo.value) === target) {
			return worktreePath;
		}
	}

	return null;
}
