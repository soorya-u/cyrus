import { ORPCError } from "@orpc/server";
import { Result } from "better-result";
import {
	createThread as createStoredThread,
	deleteThread,
	getConversations,
	getThread,
	listThreads,
	renameThread,
} from "@/mocks/threads";
import type { ControllerOs } from "./deps";

export function threadsHandlers(os: ControllerOs) {
	return {
		listThreads: os.listThreads.handler(async ({ input }) => ({
			threads: listThreads(input.projectId),
		})),

		createThread: os.createThread.handler(({ input }) =>
			Result.try(() => createStoredThread(input.projectId)).match({
				ok: (thread) => ({ thread }),
				err: () => {
					throw new ORPCError("NOT_FOUND", {
						message: `project not found: ${input.projectId}`,
					});
				},
			})
		),

		getConversations: os.getConversations.handler(({ input }) => {
			if (!getThread(input.threadId)) {
				throw new ORPCError("NOT_FOUND", {
					message: `thread not found: ${input.threadId}`,
				});
			}
			return { conversations: getConversations(input.threadId) };
		}),

		renameThread: os.renameThread.handler(({ input }) =>
			Result.try(() => renameThread(input.threadId, input.name)).match({
				ok: () => ({}),
				err: () => {
					throw new ORPCError("NOT_FOUND", {
						message: `thread not found: ${input.threadId}`,
					});
				},
			})
		),

		deleteThread: os.deleteThread.handler(({ input }) => {
			const deleted = deleteThread(input.threadId);
			if (!deleted) {
				throw new ORPCError("NOT_FOUND", {
					message: `thread not found: ${input.threadId}`,
				});
			}
			return {};
		}),
	};
}
