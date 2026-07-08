import { getConversations } from "@cyrus/database/repositories/conversations";
import {
	createThread as createStoredThread,
	deleteThread,
	getThread,
	listThreads,
	renameThread,
} from "@cyrus/database/repositories/threads";
import { throwOrpcFromRepositoryError } from "@/utils/error";
import type { ControllerOs } from "./deps";

export function threadsHandlers(os: ControllerOs) {
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
				throwOrpcFromRepositoryError({
					type: "not_found",
					entity: "thread",
					id: input.threadId,
				});
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
			const deleted = await deleteThread(input.threadId);
			if (deleted.isErr()) throwOrpcFromRepositoryError(deleted.error);
			if (!deleted.value) {
				throwOrpcFromRepositoryError({
					type: "not_found",
					entity: "thread",
					id: input.threadId,
				});
			}

			return {};
		}),
	};
}
