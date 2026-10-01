import {
	resolveProjectGitCwd,
	resolveThreadGitCwd,
} from "@cyrus/database/repositories/git";
import { resolveProjectCwd } from "@cyrus/database/repositories/projects";
import {
	getThread,
	updateThreadWorktreePath,
} from "@cyrus/database/repositories/threads";
import { orpcOk, throwOrpc } from "@cyrus/errors/orpc";
import { notFound } from "@cyrus/errors/repository";
import { Result } from "better-result";
import { checkoutGitRef } from "@/git/checkout";
import { watchGitDirectory } from "@/git/file-watch";
import { initGitRepository } from "@/git/init";
import { getGitPatch } from "@/git/patch";
import { readGitFile } from "@/git/read-file";
import { listGitRefs } from "@/git/refs";
import { getGitStatus } from "@/git/status";
import { listGitDirectory } from "@/git/tree";
import { createGitWorktree, removeGitWorktree } from "@/git/worktree";
import type { ControllerOs } from "./deps";

async function requireThreadCwd(threadId: string): Promise<string> {
	return orpcOk(await resolveThreadGitCwd(threadId));
}

async function requireProjectCwd(projectId: string): Promise<string> {
	return orpcOk(await resolveProjectGitCwd(projectId));
}

export function gitHandlers(os: ControllerOs) {
	return {
		getGitStatus: os.getGitStatus.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return getGitStatus(cwd);
		}),

		getGitPatch: os.getGitPatch.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return { patch: orpcOk(await getGitPatch(cwd, input.path)) };
		}),

		watchGitFiles: os.watchGitFiles.handler(async ({ input, signal }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return orpcOk(await watchGitDirectory(cwd, { signal }));
		}),

		readGitFile: os.readGitFile.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return orpcOk(await readGitFile(cwd, input.path));
		}),

		listGitDirectory: os.listGitDirectory.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return {
				entries: orpcOk(await listGitDirectory(cwd, input.directoryPath)),
			};
		}),

		listGitRefs: os.listGitRefs.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			return listGitRefs(cwd, input.query);
		}),

		checkoutGitRef: os.checkoutGitRef.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			orpcOk(await checkoutGitRef(cwd, input.refName));
			return {};
		}),

		createGitWorktree: os.createGitWorktree.handler(async ({ input }) => {
			const thread = orpcOk(await getThread(input.threadId));
			if (!thread) {
				throwOrpc(notFound("thread", input.threadId));
			}

			const projectCwd = orpcOk(await resolveProjectCwd(thread.projectId));
			const worktree = orpcOk(
				await createGitWorktree(projectCwd, input.refName, input.path)
			);

			const updated = await updateThreadWorktreePath(input.threadId, worktree);
			if (updated.isErr()) {
				await Result.tryPromise(() => removeGitWorktree(projectCwd, worktree));
				throwOrpc(updated.error);
			}

			return { worktreePath: worktree };
		}),

		removeGitWorktree: os.removeGitWorktree.handler(async ({ input }) => {
			const thread = orpcOk(await getThread(input.threadId));
			if (!thread) throwOrpc(notFound("thread", input.threadId));

			if (!thread.worktreePath) return {};

			const projectCwd = orpcOk(await resolveProjectCwd(thread.projectId));
			orpcOk(await removeGitWorktree(projectCwd, thread.worktreePath));
			orpcOk(await updateThreadWorktreePath(input.threadId, null));
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

		initGitRepository: os.initGitRepository.handler(async ({ input }) => {
			const cwd = await requireThreadCwd(input.threadId);
			orpcOk(await initGitRepository(cwd));
			return {};
		}),
	};
}
