import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { GetConversationsOutput } from "@cyrus/schemas/rtc/threads";
import {
	appendOptimisticUserMessage,
	appendTurnTerminal,
	removeTurnFromCache,
} from "@cyrus/utils/conversations/cache";
import {
	isTurnInterruptedError,
	settleTurnWaiter,
	waitForTurnEnd,
} from "@cyrus/utils/conversations/turn-waiters";
import { randomId } from "@cyrus/utils/identity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Result } from "better-result";
import { useCallback, useState } from "react";
import { useRtc } from "../contexts/rtc";
import { useProjects } from "./use-projects";
import { useThreads } from "./use-threads";

export function useControllerThreads() {
	const queryClient = useQueryClient();
	const { connection: workerConnection, orpc: orpcController } = useRtc();
	const [stoppingThreadIds, setStoppingThreadIds] = useState(
		() => new Set<string>()
	);

	const {
		projects,
		isLoading,
		invalidateThreads,
		createProject,
		renameProject,
		removeProject,
	} = useProjects();

	const {
		baseThreads: threads,
		createThread,
		isCreatingThread,
		renameThread,
		deleteThread,
	} = useThreads({
		projects,
		invalidateThreads,
	});

	const agentsQuery = useQuery({
		...orpcController.listAgents.queryOptions({
			queryKey: RTC_OPERATION_KEYS.listAgents,
		}),
		queryKey: RTC_OPERATION_KEYS.listAgents,
	});

	const isThreadStopping = useCallback(
		(threadId: string) => stoppingThreadIds.has(threadId),
		[stoppingThreadIds]
	);

	const [activeTurnByThread, setActiveTurnByThread] = useState(
		() => new Map<string, string>()
	);

	const isThreadActive = useCallback(
		(threadId: string) => activeTurnByThread.has(threadId),
		[activeTurnByThread]
	);

	const getActiveTurnId = useCallback(
		(threadId: string) => activeTurnByThread.get(threadId),
		[activeTurnByThread]
	);

	function setThreadStopping(threadId: string, stopping: boolean): void {
		setStoppingThreadIds((current) => {
			const next = new Set(current);
			if (stopping) next.add(threadId);
			else next.delete(threadId);
			return next;
		});
	}

	function resolveAgentName(threadId: string): string {
		const thread = threads.find((item) => item.id === threadId);
		return thread?.agentName ?? agentsQuery.data?.agents[0]?.id ?? "";
	}

	async function sendMessage(
		threadId: string,
		text: string
	): Promise<Result<void, unknown>> {
		if (stoppingThreadIds.has(threadId)) {
			return Result.err(new Error("thread is stopping"));
		}

		const thread = threads.find((item) => item.id === threadId);
		if (!thread) return Result.err(new Error(`thread not found: ${threadId}`));

		const turnId = randomId();
		appendOptimisticUserMessage(queryClient, threadId, turnId, text);

		setActiveTurnByThread((current) => new Map(current).set(threadId, turnId));

		try {
			const chatResult = await Result.tryPromise(() =>
				workerConnection.client.chat({
					agentName: resolveAgentName(threadId),
					message: text,
					projectId: thread.projectId,
					threadId,
					turnId,
				})
			);

			if (chatResult.isErr()) {
				removeTurnFromCache(queryClient, threadId, turnId);
				return chatResult.map(() => undefined);
			}

			const endResult = await Result.tryPromise(() =>
				waitForTurnEnd(threadId, turnId)
			);

			invalidateThreads(thread.projectId);

			if (endResult.isErr() && isTurnInterruptedError(endResult.error)) {
				return Result.ok(undefined);
			}

			return endResult.map(() => undefined);
		} finally {
			setActiveTurnByThread((current) => {
				const next = new Map(current);
				next.delete(threadId);
				return next;
			});
		}
	}

	async function stopThread(threadId: string): Promise<Result<void, unknown>> {
		setThreadStopping(threadId, true);

		try {
			const data = queryClient.getQueryData<GetConversationsOutput>(
				RTC_OPERATION_KEYS.getConversations(threadId)
			);
			const conversations = data?.conversations ?? [];

			const turnIds = new Set(conversations.map((entry) => entry.chunk.turnId));
			const terminalTurnIds = new Set(
				conversations
					.filter(
						(entry) =>
							entry.chunk.event.type === "turn_completed" ||
							entry.chunk.event.type === "turn_interrupted"
					)
					.map((entry) => entry.chunk.turnId)
			);
			const activeTurnIds = [...turnIds].filter(
				(id) => !terminalTurnIds.has(id)
			);

			for (const turnId of activeTurnIds) {
				appendTurnTerminal(queryClient, threadId, turnId, "turn_interrupted");
				settleTurnWaiter(threadId, turnId, { type: "turn_interrupted" });
			}

			const result = await Result.tryPromise(() =>
				workerConnection.client.cancel({
					agentName: resolveAgentName(threadId),
					threadId,
				})
			);

			if (result.isOk()) {
				await queryClient.refetchQueries({
					queryKey: RTC_OPERATION_KEYS.getConversations(threadId),
				});
			}

			return result.map(() => undefined);
		} finally {
			setThreadStopping(threadId, false);
		}
	}

	return {
		projects,
		threads,
		isLoading,
		createProject,
		renameProject,
		removeProject,
		createThread,
		isCreatingThread,
		renameThread,
		deleteThread,
		sendMessage,
		stopThread,
		isThreadStopping,
		isThreadActive,
		getActiveTurnId,
	};
}

export type UseControllerThreads = ReturnType<typeof useControllerThreads>;
