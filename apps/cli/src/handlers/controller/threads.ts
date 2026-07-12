import {
	getConversations,
	getSnapshotHighWaterMark,
} from "@cyrus/database/repositories/conversations";
import {
	createThread as createStoredThread,
	deleteThread,
	getThread,
	getThreadSession,
	listThreads,
	renameThread,
} from "@cyrus/database/repositories/threads";
import { notFound } from "@cyrus/database/utils/error";
import { throwOrpcFromRepositoryError } from "@/utils/error";
import type { ControllerDeps } from "./deps";

export function threadsHandlers({ os, runtime }: ControllerDeps) {
	return {
		listThreads: os.listThreads.handler(async ({ input }) =>
			(await listThreads(input.projectId)).match({
				ok: (threads) => ({ threads }),
				err: throwOrpcFromRepositoryError,
			})
		),

		createThread: os.createThread.handler(async ({ input }) =>
			(await createStoredThread(input.projectId)).match({
				ok: (thread) => ({ thread }),
				err: throwOrpcFromRepositoryError,
			})
		),

		getConversations: os.getConversations.handler(async ({ input }) => {
			const thread = await getThread(input.threadId);
			if (thread.isErr()) throwOrpcFromRepositoryError(thread.error);
			if (!thread.value) {
				throwOrpcFromRepositoryError(notFound("thread", input.threadId));
			}

			return (await getConversations(input.threadId, input.afterSeq)).match({
				ok: (conversations) => ({ conversations }),
				err: throwOrpcFromRepositoryError,
			});
		}),

		renameThread: os.renameThread.handler(async ({ input }) =>
			(await renameThread(input.threadId, input.name)).match({
				ok: () => ({}),
				err: throwOrpcFromRepositoryError,
			})
		),

		deleteThread: os.deleteThread.handler(async ({ input }) => {
			const session = await getThreadSession(input.threadId);
			if (session.isErr()) throwOrpcFromRepositoryError(session.error);
			if (session.value) {
				await runtime.threadCoordinator.closeThreadSession(
					input.threadId,
					session.value.sessionId,
					session.value.agentName
				);
			}

			const deleted = await deleteThread(input.threadId);
			if (deleted.isErr()) throwOrpcFromRepositoryError(deleted.error);
			if (!deleted.value) {
				throwOrpcFromRepositoryError(notFound("thread", input.threadId));
			}

			return {};
		}),

		watchThread: os.watchThread.handler(async ({ input, context }) => {
			const thread = await getThread(input.threadId);
			if (thread.isErr()) throwOrpcFromRepositoryError(thread.error);
			if (!thread.value) {
				throwOrpcFromRepositoryError(notFound("thread", input.threadId));
			}

			context.eventBus.watch(context.peerId, input.threadId);

			return (await getSnapshotHighWaterMark(input.threadId)).match({
				ok: (snapshotHighWaterMark) => ({ snapshotHighWaterMark }),
				err: throwOrpcFromRepositoryError,
			});
		}),

		unwatchThread: os.unwatchThread.handler(({ input, context }) => {
			context.eventBus.unwatch(context.peerId, input.threadId);
			return {};
		}),
	};
}
