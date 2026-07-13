import {
	getProject,
	resolveProjectCwd,
} from "@cyrus/database/repositories/projects";
import { getThread } from "@cyrus/database/repositories/threads";
import type { RepositoryError } from "@cyrus/database/utils/error";
import { notFound } from "@cyrus/database/utils/error";
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

export async function getThreadProjectCwd(
	threadId: string
): Promise<Result<string, RepositoryError>> {
	const thread = await getThread(threadId);
	if (thread.isErr()) return Result.err(thread.error);
	if (!thread.value) return Result.err(notFound("thread", threadId));

	const project = await getProject(thread.value.projectId);
	if (project.isErr()) return Result.err(project.error);
	if (!project.value)
		return Result.err(notFound("project", thread.value.projectId));

	return Result.ok(project.value.cwd);
}
