import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { appendChunkToCache } from "@cyrus/utils/conversation-cache";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Result } from "better-result";
import { useRtc } from "../contexts/rtc";
import { useAgentCatalogStore } from "../stores/agent-catalog";
import { useProjects } from "./use-projects";
import { useThreads } from "./use-threads";

export function useControllerThreads() {
	const queryClient = useQueryClient();
	const { connection: workerConnection, orpc: orpcController } = useRtc();

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

	const selectionByThread = useAgentCatalogStore(
		(state) => state.selectionByThread
	);

	function resolveAgentName(threadId: string): string {
		const thread = threads.find((item) => item.id === threadId);
		return (
			selectionByThread[threadId]?.agentName ??
			thread?.agentName ??
			agentsQuery.data?.agents[0]?.name ??
			""
		);
	}

	async function sendMessage(
		threadId: string,
		text: string
	): Promise<Result<void, unknown>> {
		const thread = threads.find((item) => item.id === threadId);
		if (!thread) return Result.err(new Error(`thread not found: ${threadId}`));

		const result = await Result.tryPromise(async () => {
			const iterator = await workerConnection.client.chat({
				agentName: resolveAgentName(threadId),
				message: text,
				projectId: thread.projectId,
				threadId,
			});
			for await (const chunk of iterator) {
				appendChunkToCache(queryClient, chunk);
			}
		});
		invalidateThreads(thread.projectId);
		return result;
	}

	async function stopThread(threadId: string): Promise<Result<void, unknown>> {
		const result = await Result.tryPromise(() =>
			workerConnection.client.cancel({
				agentName: resolveAgentName(threadId),
				threadId,
			})
		);
		return result.map(() => undefined);
	}

	return {
		projects,
		threads,
		isLoading,
		createProject,
		renameProject,
		removeProject,
		createThread,
		renameThread,
		deleteThread,
		sendMessage,
		stopThread,
	};
}

export type UseControllerThreads = ReturnType<typeof useControllerThreads>;
