import { resolveProjectCwd } from "@cyrus/database/repositories/projects";
import { getThread } from "@cyrus/database/repositories/threads";
import type { RepositoryError } from "@cyrus/errors/repository";
import { notFound } from "@cyrus/errors/repository";
import { Result } from "better-result";

export async function resolveThreadGitCwd(
	threadId: string
): Promise<Result<string, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));

	if (thread.value.worktreePath) return Result.ok(thread.value.worktreePath);

	return resolveProjectCwd(thread.value.projectId);
}

export async function resolveProjectGitCwd(
	projectId: string
): Promise<Result<string, RepositoryError>> {
	return await resolveProjectCwd(projectId);
}
