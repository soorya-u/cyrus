import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { isTurnInterruptedError } from "@cyrus/errors/turn";
import type { ChatMessage } from "@cyrus/schemas/rtc/chat";
import { formatPromptBlocks } from "@cyrus/schemas/rtc/chat";
import type { GetConversationsOutput } from "@cyrus/schemas/rtc/threads";
import {
	settleTurnWaiter,
	waitForTurnEnd,
} from "@cyrus/utils/conversations/turn-waiters";
import { randomId } from "@cyrus/utils/identity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Result } from "better-result";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRtc } from "../contexts/rtc";
import { usePromptQueueStore } from "../stores/prompt-queue";
import {
	appendOptimisticUserMessage,
	appendTurnTerminal,
	removeTurnFromCache,
} from "./conversation-cache";
import { useProjects } from "./use-projects";
import { useThreads } from "./use-threads";

function listOpenConversationTurnIds(
	queryClient: ReturnType<typeof useQueryClient>,
	threadId: string
): string[] {
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
	return [...turnIds].filter((id) => !terminalTurnIds.has(id));
}

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
	const activeTurnByThreadRef = useRef(activeTurnByThread);
	activeTurnByThreadRef.current = activeTurnByThread;
	const drainingQueueRef = useRef(new Set<string>());

	const isThreadActive = useCallback(
		(threadId: string) => activeTurnByThreadRef.current.has(threadId),
		[]
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

	const sendMessageNow = useCallback(
		async (
			threadId: string,
			message: ChatMessage
		): Promise<Result<void, unknown>> => {
			if (stoppingThreadIds.has(threadId)) {
				return Result.err(new Error("thread is stopping"));
			}

			const thread = threads.find((item) => item.id === threadId);
			if (!thread)
				return Result.err(new Error(`thread not found: ${threadId}`));

			const agentName =
				thread.agentName ?? agentsQuery.data?.agents[0]?.id ?? "";
			const turnId = randomId();
			appendOptimisticUserMessage(
				queryClient,
				threadId,
				turnId,
				formatPromptBlocks(message),
				message
			);

			setActiveTurnByThread((current) => {
				const next = new Map(current).set(threadId, turnId);
				activeTurnByThreadRef.current = next;
				return next;
			});

			const clearActiveTurn = () => {
				setActiveTurnByThread((current) => {
					const next = new Map(current);
					next.delete(threadId);
					activeTurnByThreadRef.current = next;
					return next;
				});
			};

			const chatResult = await Result.tryPromise(() =>
				workerConnection.client.chat({
					agentName,
					message,
					projectId: thread.projectId,
					threadId,
					turnId,
				})
			);

			if (chatResult.isErr()) {
				removeTurnFromCache(queryClient, threadId, turnId);
				clearActiveTurn();
				return chatResult.map(() => undefined);
			}

			// Keep the composer free after accept: wait for turn end in the
			// background so queue drain / busy state still track the live turn.
			waitForTurnEnd(threadId, turnId)
				.then((endResult) => {
					invalidateThreads(thread.projectId);
					if (endResult.isErr() && !isTurnInterruptedError(endResult.error)) {
						return;
					}
				})
				.finally(() => {
					clearActiveTurn();
				});

			return Result.ok(undefined);
		},
		[
			agentsQuery.data?.agents,
			invalidateThreads,
			queryClient,
			stoppingThreadIds,
			threads,
			workerConnection.client,
		]
	);

	const drainPromptQueue = useCallback(
		async (threadId: string) => {
			if (drainingQueueRef.current.has(threadId)) return;
			drainingQueueRef.current.add(threadId);
			try {
				while (true) {
					if (
						usePromptQueueStore.getState().queueByThread[threadId]?.length === 0
					) {
						return;
					}
					if (activeTurnByThreadRef.current.has(threadId)) return;
					if (listOpenConversationTurnIds(queryClient, threadId).length > 0) {
						return;
					}

					const next = usePromptQueueStore.getState().peek(threadId);
					if (!next) return;

					const result = await sendMessageNow(threadId, next.message);
					if (result.isErr()) return;

					usePromptQueueStore.getState().remove(threadId, next.id);
				}
			} finally {
				drainingQueueRef.current.delete(threadId);
			}
		},
		[queryClient, sendMessageNow]
	);

	useEffect(() => {
		for (const thread of threads) {
			if (activeTurnByThread.has(thread.id)) continue;
			drainPromptQueue(thread.id).catch(() => undefined);
		}
	}, [activeTurnByThread, drainPromptQueue, threads]);

	function sendMessage(
		threadId: string,
		message: ChatMessage
	): Promise<Result<void, unknown>> {
		if (
			isThreadActive(threadId) ||
			listOpenConversationTurnIds(queryClient, threadId).length > 0
		) {
			usePromptQueueStore.getState().enqueue(threadId, message);
			return Promise.resolve(Result.ok(undefined));
		}

		return sendMessageNow(threadId, message);
	}

	async function stopThread(threadId: string): Promise<Result<void, unknown>> {
		setThreadStopping(threadId, true);

		try {
			const activeTurnIds = listOpenConversationTurnIds(queryClient, threadId);

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
