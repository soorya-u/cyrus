import {
	resolveProjectGitCwd,
	resolveThreadGitCwd,
} from "@cyrus/database/repositories/git";
import { resolveProjectCwd } from "@cyrus/database/repositories/projects";
import {
	getThread,
	updateThreadWorktreePath,
} from "@cyrus/database/repositories/threads";
import { throwOrpc } from "@cyrus/errors/orpc";
import { notFound } from "@cyrus/errors/repository";
import { checkoutGitRef } from "@/git/checkout";
import { getGitPatch } from "@/git/patch";
import { listGitRefs } from "@/git/refs";
import { getGitStatus } from "@/git/status";
import { createGitWorktree, removeGitWorktree } from "@/git/worktree";
import type { ControllerOs } from "./deps";

async function requireThreadCwd(threadId: string): Promise<string> {
	const cwd = await resolveThreadGitCwd(threadId);
	if (cwd.isErr()) throwOrpc(cwd.error);
	return cwd.value;
}

async function requireProjectCwd(projectId: string): Promise<string> {
	const cwd = await resolveProjectGitCwd(projectId);
	if (cwd.isErr()) throwOrpc(cwd.error);
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
				err: throwOrpc,
			});
		}),

		createGitWorktree: os.createGitWorktree.handler(async ({ input }) => {
			const thread = await getThread(input.threadId);
			if (thread.isErr()) throwOrpc(thread.error);
			if (!thread.value) {
				throwOrpc(notFound("thread", input.threadId));
			}

			const projectCwd = await resolveProjectCwd(thread.value.projectId);
			if (projectCwd.isErr()) throwOrpc(projectCwd.error);

			const worktree = await createGitWorktree(
				projectCwd.value,
				input.refName,
				input.path
			);
			if (worktree.isErr()) throwOrpc(worktree.error);

			const updated = await updateThreadWorktreePath(
				input.threadId,
				worktree.value
			);
			if (updated.isErr()) throwOrpc(updated.error);

			return { worktreePath: worktree.value };
		}),

		removeGitWorktree: os.removeGitWorktree.handler(async ({ input }) => {
			const thread = await getThread(input.threadId);
			if (thread.isErr()) throwOrpc(thread.error);
			if (!thread.value?.worktreePath) return {};

			const projectCwd = await resolveProjectCwd(thread.value.projectId);
			if (projectCwd.isErr()) throwOrpc(projectCwd.error);

			const removed = await removeGitWorktree(
				projectCwd.value,
				thread.value.worktreePath
			);
			if (removed.isErr()) throwOrpc(removed.error);

			const updated = await updateThreadWorktreePath(input.threadId, null);
			if (updated.isErr()) throwOrpc(updated.error);
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
