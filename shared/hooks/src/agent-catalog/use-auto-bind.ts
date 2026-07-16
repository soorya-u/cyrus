import type { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAgentCatalogStore } from "../stores/agent-catalog";

type BindAgentInput = {
	threadId: string;
	projectId: string;
	agentName: string;
};

type UseAutoBindOptions = {
	threadId: string;
	projectId: string;
	agents: { id: string; name: string }[];
	agentLocked: boolean;
	threadAgentName: string | undefined;
	persistedSessionId: string | undefined;
	modelsQueryKey: ReturnType<typeof RTC_OPERATION_KEYS.getModels>;
	bindAgent: (input: BindAgentInput) => void;
	bindAgentPending: boolean;
	bindIsError: boolean;
};

/**
 * Auto-binds an agent when a thread has none live: rehydrates a persisted
 * session for committed threads, or binds the default agent for drafts.
 */
export function useAutoBind({
	threadId,
	projectId,
	agents,
	agentLocked,
	threadAgentName,
	persistedSessionId,
	modelsQueryKey,
	bindAgent,
	bindAgentPending,
	bindIsError,
}: UseAutoBindOptions): void {
	const queryClient = useQueryClient();
	const markResumeBindRequested = useAgentCatalogStore(
		(state) => state.markResumeBindRequested
	);

	useEffect(() => {
		const store = useAgentCatalogStore.getState();
		if (
			bindAgentPending ||
			store.pendingAgentByThread[threadId] ||
			store.resumeBindRequestedByThread[threadId]
		) {
			return;
		}
		if (bindIsError) return;

		const currentLive = store.liveBindingByThread[threadId];
		if (currentLive) return;

		// Committed threads: rehydrate the persisted session after worker restart.
		if (agentLocked && threadAgentName && persistedSessionId) {
			const cachedModels = queryClient.getQueryData<{ models: unknown[] }>(
				modelsQueryKey
			);
			if (cachedModels?.models?.length) return;

			markResumeBindRequested(threadId);
			bindAgent({ threadId, projectId, agentName: threadAgentName });
			return;
		}

		// Drafts: bind the first agent; session stays worker-local until first message.
		if (agentLocked) return;
		const defaultAgent = agents[0]?.id;
		if (!defaultAgent) return;

		markResumeBindRequested(threadId);
		bindAgent({ threadId, projectId, agentName: defaultAgent });
	}, [
		agentLocked,
		agents,
		bindAgent,
		bindIsError,
		bindAgentPending,
		markResumeBindRequested,
		modelsQueryKey,
		persistedSessionId,
		projectId,
		queryClient,
		threadAgentName,
		threadId,
	]);
}
