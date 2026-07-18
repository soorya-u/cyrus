import { ensureThread, getThread } from "@cyrus/database/repositories/threads";
import { CoordinatorAgentNotBoundError } from "@cyrus/errors/coordinator";
import { throwOrpc } from "@cyrus/errors/orpc";
import { formatPromptBlocks } from "@cyrus/schemas/rtc/chat";
import { randomId } from "@cyrus/utils/identity";
import { ORPCError } from "@orpc/server";
import type { ControllerDeps } from "./deps";
import { launchTurn } from "./turn-emit";

export function chatHandlers({ os, runtime }: ControllerDeps) {
	return {
		chat: os.chat.handler(async ({ input, context }) => {
			const {
				agentName,
				threadId = randomId(),
				turnId = randomId(),
				message,
				projectId,
			} = input;

			const existing = await getThread(threadId);
			if (existing.isErr()) throwOrpc(existing.error);
			if (!existing.value)
				throw new ORPCError("NOT_FOUND", {
					message: `thread ${threadId} not found`,
				});

			const bound = await runtime.threadCoordinator.bind(
				threadId,
				projectId,
				agentName
			);
			if (bound.isErr()) {
				if (CoordinatorAgentNotBoundError.is(bound.error)) {
					throw new ORPCError("BAD_REQUEST", {
						message: "thread has no agent session; retry or start a new thread",
					});
				}
				throwOrpc(bound.error);
			}

			const thread = await ensureThread(threadId, projectId, {
				firstMessage: formatPromptBlocks(message),
			});
			if (thread.isErr()) throwOrpc(thread.error);

			launchTurn({
				agentName,
				threadId,
				projectId,
				turnId,
				message,
				context,
				runtime,
			});

			return { threadId, turnId };
		}),

		startThread: os.startThread.handler(async ({ input, context }) => {
			const turnId = input.turnId ?? randomId();
			const started = await runtime.threadCoordinator.startThread({
				projectId: input.projectId,
				agentName: input.agentName,
				message: input.message,
				preferences: input.preferences,
				branch: input.branch,
				worktree: input.worktree,
				worktreePath: input.worktreePath,
				turnId,
			});
			if (started.isErr()) throwOrpc(started.error);

			const { threadId, bound } = started.value;

			// Compound startThread includes the prompt: setup returns a live
			// binding, then launchTurn starts the first turn asynchronously.
			if (bound)
				launchTurn({
					agentName: input.agentName,
					threadId,
					projectId: input.projectId,
					turnId,
					message: input.message,
					context,
					runtime,
				});
			else context.eventBus.ensureWatch(context.peerId, threadId);

			return { threadId, turnId };
		}),

		subscribe: os.subscribe.handler(async function* ({ context }) {
			for await (const chunk of context.eventBus.subscribe(context.peerId))
				yield chunk;
		}),

		cancel: os.cancel.handler(async ({ input, context }) => {
			const snapshottedTurnIds = context.eventBus.getActiveTurnIdsForThread(
				input.threadId
			);

			await runtime.threadCoordinator.cancel(input.agentName, input.threadId);

			const stillActiveTurnIds = new Set(
				context.eventBus.getActiveTurnIdsForThread(input.threadId)
			);

			for (const turnId of snapshottedTurnIds) {
				if (!stillActiveTurnIds.has(turnId)) continue;
				context.eventBus.publish({
					threadId: input.threadId,
					turnId,
					seq: 0,
					event: { type: "turn_interrupted" },
				});
			}

			return {};
		}),
	};
}
