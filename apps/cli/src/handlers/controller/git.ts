import {
	resolveProjectGitCwd,
	resolveThreadGitCwd,
} from "@cyrus/database/repositories/git";
import { resolveProjectCwd } from "@cyrus/database/repositories/projects";
import {
	getThread,
	updateThreadWorktreePath,
} from "@cyrus/database/repositories/threads";
import { notFound } from "@cyrus/database/utils/error";
import { checkoutGitRef } from "@/git/checkout";
import { getGitPatch } from "@/git/patch";
import { listGitRefs } from "@/git/refs";
import { getGitStatus } from "@/git/status";
import { createGitWorktree, removeGitWorktree } from "@/git/worktree";
import {
	throwOrpcFromGitError,
	throwOrpcFromRepositoryError,
} from "@/utils/error";
import type { ControllerOs } from "./deps";

async function requireThreadCwd(threadId: string): Promise<string> {
	const cwd = await resolveThreadGitCwd(threadId);
	if (cwd.isErr()) throwOrpcFromRepositoryError(cwd.error);
	return cwd.value;
}

async function requireProjectCwd(projectId: string): Promise<string> {
	const cwd = await resolveProjectGitCwd(projectId);
	if (cwd.isErr()) throwOrpcFromRepositoryError(cwd.error);
	return cwd.value;
}

export function gitHandlers(os: ControllerOs) {
	return {
		getGitStatus: os.getGitStatus.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return getGitStatus(cwd);
		}),

		getGitPatch: os.getGitPatch.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return { patch: await getGitPatch(cwd, input.path) };
		}),

		listGitRefs: os.listGitRefs.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return listGitRefs(cwd, input.query);
		}),

		checkoutGitRef: os.checkoutGitRef.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return (await checkoutGitRef(cwd, input.refName)).match({
				ok: () => ({}),
				err: throwOrpcFromGitError,
			});
		}),

		createGitWorktree: os.createGitWorktree.handler(async ({ input }) => {
			const thread = await getThread(input.threadId);
			if (thread.isErr()) throwOrpcFromRepositoryError(thread.error);
			if (!thread.value) {
				throwOrpcFromRepositoryError(notFound("thread", input.threadId));
			}

			const projectCwd = await resolveProjectCwd(thread.value.projectId);
			if (projectCwd.isErr()) throwOrpcFromRepositoryError(projectCwd.error);

			const worktree = await createGitWorktree(
				projectCwd.value,
				input.refName,
				input.path
			);
			if (worktree.isErr()) throwOrpcFromGitError(worktree.error);

			const updated = await updateThreadWorktreePath(
				input.threadId,
				worktree.value
			);
			if (updated.isErr()) throwOrpcFromRepositoryError(updated.error);

			return { worktreePath: worktree.value };
		}),

		removeGitWorktree: os.removeGitWorktree.handler(async ({ input }) => {
			const thread = await getThread(input.threadId);
			if (thread.isErr()) throwOrpcFromRepositoryError(thread.error);
			if (!thread.value?.worktreePath) return {};

			const projectCwd = await resolveProjectCwd(thread.value.projectId);
			if (projectCwd.isErr()) throwOrpcFromRepositoryError(projectCwd.error);

			const removed = await removeGitWorktree(
				projectCwd.value,
				thread.value.worktreePath
			);
			if (removed.isErr()) throwOrpcFromGitError(removed.error);

			const updated = await updateThreadWorktreePath(input.threadId, null);
			if (updated.isErr()) throwOrpcFromRepositoryError(updated.error);
			return {};
		}),

		getProjectGitStatus: os.getProjectGitStatus.handler(async ({ input }) => {
			const cwd = await requireProjectCwd(input.projectId);
			return getGitStatus(cwd);
		}),

		listProjectGitRefs: os.listProjectGitRefs.handler(async ({ input }) => {
			const cwd = await requireProjectCwd(input.projectId);
			return listGitRefs(cwd, input.query);
		}),
	};
}
