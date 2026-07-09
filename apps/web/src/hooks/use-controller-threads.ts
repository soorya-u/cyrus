import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { Result } from "better-result";
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
		// TODO: These kind of errors will eventually be very harder to track. Maybe we need better types of errors altogether.
		if (!workerConnection) return Result.err(new Error("worker not connected"));

		const thread = threads.find((item) => item.id === threadId);
		if (!thread) return Result.err(new Error(`thread not found: ${threadId}`));

		const result = await Result.tryPromise(async () => {
			const iterator = await workerConnection.client.chat({
				agentName: resolveAgentName(threadId),
				message: text,
				projectId: thread.projectId,
				threadId,
			});
			for await (const chunk of iterator)
				appendChunkToCache(queryClient, chunk);
		});
		invalidateThreads(thread.projectId);
		return result;
	}

	async function stopThread(threadId: string): Promise<Result<void, unknown>> {
		if (!workerConnection) return Result.ok(undefined);
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
