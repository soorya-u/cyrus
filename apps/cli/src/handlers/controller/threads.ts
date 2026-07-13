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
import { throwOrpc } from "@cyrus/errors/orpc";
import { notFound } from "@cyrus/errors/repository";
import { tryCheckoutGitRef } from "@/git/checkout";
import { removeGitWorktree } from "@/git/worktree";
import type { ControllerDeps } from "./deps";

export function threadsHandlers({ os, runtime }: ControllerDeps) {
	return {
		listThreads: os.listThreads.handler(async ({ input }) =>
			(await listThreads(input.projectId)).match({
				ok: (threads) => ({ threads }),
				err: throwOrpc,
			})
		),

		createThread: os.createThread.handler(async ({ input }) => {
			const created = await createStoredThread(input.projectId, {
				branch: input.branch,
				worktreePath: input.worktreePath,
			});
			if (created.isErr()) throwOrpc(created.error);

			if (input.branch && !input.worktreePath) {
				const projectCwd = await resolveProjectCwd(input.projectId);
				if (projectCwd.isOk())
					await tryCheckoutGitRef(projectCwd.value, input.branch);
			}

			return { thread: created.value };
		}),

		getConversations: os.getConversations.handler(async ({ input }) => {
			const thread = await getThread(input.threadId);
			if (thread.isErr()) throwOrpc(thread.error);
			if (!thread.value) throwOrpc(notFound("thread", input.threadId));

			return (await getConversations(input.threadId, input.afterSeq)).match({
				ok: (conversations) => ({ conversations }),
				err: throwOrpc,
			});
		}),

		renameThread: os.renameThread.handler(async ({ input }) =>
			(await renameThread(input.threadId, input.name)).match({
				ok: () => ({}),
				err: throwOrpc,
			})
		),

		deleteThread: os.deleteThread.handler(async ({ input }) => {
			const thread = await getThread(input.threadId);
			if (thread.isErr()) throwOrpc(thread.error);
			if (!thread.value) throwOrpc(notFound("thread", input.threadId));

			if (thread.value.sessionId && thread.value.agentName) {
				await runtime.threadCoordinator.closeThreadSession(
					input.threadId,
					thread.value.sessionId,
					thread.value.agentName
				);
			}

			if (thread.value.worktreePath) {
				const projectCwd = await resolveProjectCwd(thread.value.projectId);
				if (projectCwd.isOk())
					await removeGitWorktree(projectCwd.value, thread.value.worktreePath);
			}

			const deleted = await deleteThread(input.threadId);
			if (deleted.isErr()) throwOrpc(deleted.error);
			if (!deleted.value) throwOrpc(notFound("thread", input.threadId));

			return {};
		}),

		watchThread: os.watchThread.handler(async ({ input, context }) => {
			const thread = await getThread(input.threadId);
			if (thread.isErr()) throwOrpc(thread.error);
			if (!thread.value) throwOrpc(notFound("thread", input.threadId));

			context.eventBus.watch(context.peerId, input.threadId);

			return (await getSnapshotHighWaterMark(input.threadId)).match({
				ok: (snapshotHighWaterMark) => ({ snapshotHighWaterMark }),
				err: throwOrpc,
			});
		}),

		unwatchThread: os.unwatchThread.handler(({ input, context }) => {
			context.eventBus.unwatch(context.peerId, input.threadId);
			return {};
		}),
	};
}
