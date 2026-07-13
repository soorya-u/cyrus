import { basename, dirname, join } from "node:path";

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
