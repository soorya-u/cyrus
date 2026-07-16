import {
	getConversations,
	getSnapshotHighWaterMark,
} from "@cyrus/database/repositories/conversations";
import { resolveProjectCwd } from "@cyrus/database/repositories/projects";
import {
	createThread as createStoredThread,
	deleteThread,
	getThread,
	listThreads,
	renameThread,
} from "@cyrus/database/repositories/threads";
import { orpcOk, throwOrpc } from "@cyrus/errors/orpc";
import { notFound } from "@cyrus/errors/repository";
import { log } from "evlog";
import { tryCheckoutGitRef } from "@/git/checkout";
import { removeGitWorktree } from "@/git/worktree";
import type { ControllerDeps } from "./deps";

export function threadsHandlers({ os, runtime }: ControllerDeps) {
	return {
		listThreads: os.listThreads.handler(async ({ input }) => ({
			threads: orpcOk(await listThreads(input.projectId)),
		})),

		createThread: os.createThread.handler(async ({ input }) => {
			const thread = orpcOk(
				await createStoredThread(input.projectId, {
					branch: input.branch,
					worktreePath: input.worktreePath,
				})
			);

			if (input.branch && !input.worktreePath) {
				const projectCwd = await resolveProjectCwd(input.projectId);
				if (projectCwd.isOk()) {
					orpcOk(await tryCheckoutGitRef(projectCwd.value, input.branch));
				}
			}

			return { thread };
		}),

		getConversations: os.getConversations.handler(async ({ input }) => {
			const thread = orpcOk(await getThread(input.threadId));
			if (!thread) throwOrpc(notFound("thread", input.threadId));

			return {
				conversations: orpcOk(
					await getConversations(input.threadId, input.afterSeq)
				),
			};
		}),

		renameThread: os.renameThread.handler(async ({ input }) => {
			orpcOk(await renameThread(input.threadId, input.name));
			return {};
		}),

		deleteThread: os.deleteThread.handler(async ({ input }) => {
			const thread = orpcOk(await getThread(input.threadId));
			if (!thread) throwOrpc(notFound("thread", input.threadId));

			await runtime.threadCoordinator.closeAnyThreadSession(input.threadId);

			if (thread.worktreePath) {
				const projectCwd = await resolveProjectCwd(thread.projectId);
				if (projectCwd.isOk()) {
					const removed = await removeGitWorktree(
						projectCwd.value,
						thread.worktreePath
					);
					if (removed.isErr())
						log.warn({
							kind: "worktree_cleanup_failed",
							threadId: input.threadId,
							worktreePath: thread.worktreePath,
							error: removed.error,
						});
				}
			}

			const deleted = orpcOk(await deleteThread(input.threadId));
			if (!deleted) throwOrpc(notFound("thread", input.threadId));

			return {};
		}),

		watchThread: os.watchThread.handler(async ({ input, context }) => {
			const thread = orpcOk(await getThread(input.threadId));
			if (!thread) throwOrpc(notFound("thread", input.threadId));

			context.eventBus.watch(context.peerId, input.threadId);

			return {
				snapshotHighWaterMark: orpcOk(
					await getSnapshotHighWaterMark(input.threadId)
				),
			};
		}),

		unwatchThread: os.unwatchThread.handler(({ input, context }) => {
			context.eventBus.unwatch(context.peerId, input.threadId);
			return {};
		}),
	};
}
