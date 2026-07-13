import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Result } from "better-result";
import type { GitError } from "../errors/git";
import { operationFailedError } from "../errors/git";
import {
	openGitRepository,
	operationFailedFromUnknown,
	runGitOperationAsync,
} from "./open";
import { defaultWorktreePath, worktreeNameForBranch } from "./paths";

export async function createGitWorktree(
	projectCwd: string,
	refName: string,
	path?: string
): Promise<Result<string, GitError>> {
	const opened = await openGitRepository(projectCwd);
	if (opened.isErr()) return Result.err(opened.error);

	const worktreePath = path ?? defaultWorktreePath(projectCwd, refName);
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
	if (created.isErr()) {
		return Result.err(operationFailedFromUnknown(created.error));
	}
	return Result.ok(created.value);
}

export async function removeGitWorktree(
	projectCwd: string,
	worktreePath: string
): Promise<Result<void, GitError>> {
	return (
		await Result.tryPromise(async () => {
			const proc = Bun.spawn(
				["git", "worktree", "remove", worktreePath, "--force"],
				{
					cwd: projectCwd,
					stdout: "pipe",
					stderr: "pipe",
				}
			);
			const exitCode = await proc.exited;
			if (exitCode !== 0) {
				const stderr = await new Response(proc.stderr).text();
				throw new Error(stderr.trim() || "Failed to remove worktree");
			}
		})
	).mapError((error) =>
		operationFailedError(error instanceof Error ? error.message : String(error))
	);
}
