import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useCallback } from "react";
import { RTC_OPERATION_KEYS } from "@/constants/operation-keys";
import { useProjects } from "@/hooks/projects/use-projects";
import { useThreads } from "@/hooks/threads/use-threads";
import type { ControllerConnection } from "@/lib/orpc";
import { useAgentCatalogStore } from "@/stores/agent-catalog";
import { appendChunkToCache } from "@/utils/conversation-cache";

// plain hook — safe to call from as many components as need it.
// TanStack Query dedupes the underlying queries by key, and sendMessage/
// stopThread hold no state of their own (they just call workerConnection.client
// and write into the shared query cache). The one thing that does need a
// single instance — the subscribe() live-sync loop — lives in
// useWorkerConversationSync instead, mounted once via <WorkerConversationSync />.
export function useControllerThreads() {
	const queryClient = useQueryClient();
	const { workerConnection } = useRouteContext({ strict: false }) as {
		workerConnection?: ControllerConnection;
	};

	const {
		projects,
		isLoading,
		orpcController,
		invalidateThreads,
		createProject,
		renameProject,
		removeProject,
	} = useProjects();

	const {
		baseThreads: threads,
		createThread,
		renameThread,
		archiveThread,
		deleteThread,
	} = useThreads({
		orpcController,
		projects,
		invalidateThreads,
	});

	const agentsQuery = useQuery({
		...orpcController?.listAgents.queryOptions({
			queryKey: RTC_OPERATION_KEYS.listAgents,
		}),
		queryKey: RTC_OPERATION_KEYS.listAgents,
		enabled: Boolean(orpcController),
	});

	const agentByThread = useAgentCatalogStore((state) => state.agentByThread);

	const resolveAgentName = useCallback(
		(threadId: string): string => {
			const thread = threads.find((item) => item.id === threadId);
			return (
				agentByThread[threadId] ??
				thread?.branch ??
				agentsQuery.data?.agents[0]?.name ??
				""
			);
		},
		[threads, agentsQuery.data, agentByThread]
	);

	const sendMessage = useCallback(
		async (threadId: string, text: string) => {
			if (!workerConnection) throw new Error("worker not connected");
			const thread = threads.find((item) => item.id === threadId);
			if (!thread) throw new Error(`thread not found: ${threadId}`);

			const iterator = await workerConnection.client.chat({
				agentName: resolveAgentName(threadId),
				message: text,
				projectId: thread.projectId,
				threadId,
			});
			for await (const chunk of iterator) {
				appendChunkToCache(queryClient, chunk);
			}
			invalidateThreads(thread.projectId);
		},
		[
			workerConnection,
			threads,
			resolveAgentName,
			queryClient,
			invalidateThreads,
		]
	);

	const stopThread = useCallback(
		async (threadId: string) => {
			if (!workerConnection) return;
			await workerConnection.client.cancel({
				agentName: resolveAgentName(threadId),
				threadId,
			});
		},
		[workerConnection, resolveAgentName]
	);

	return {
		projects,
		threads,
		isLoading,
		createProject,
		renameProject,
		removeProject,
		createThread,
		renameThread,
		archiveThread,
		deleteThread,
		sendMessage,
		stopThread,
	};
}

export type UseControllerThreads = ReturnType<typeof useControllerThreads>;
