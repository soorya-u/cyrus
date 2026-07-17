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
	agentLocked: boolean;
	threadAgentName: string | undefined;
	persistedSessionId: string | undefined;
	modelsQueryKey: ReturnType<typeof RTC_OPERATION_KEYS.getModels>;
	bindAgent: (input: BindAgentInput) => void;
	bindAgentPending: boolean;
	bindIsError: boolean;
};

/**
 * Rehydrates a persisted session for committed threads after worker restart.
 * Drafts do not bind — their catalog comes from getDraftCatalog probes.
 */
export function useAutoBind({
	threadId,
	projectId,
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

		if (!(agentLocked && threadAgentName && persistedSessionId)) return;

		const cachedModels = queryClient.getQueryData<{ models: unknown[] }>(
			modelsQueryKey
		);
		if (cachedModels?.models?.length) return;

		markResumeBindRequested(threadId);
		bindAgent({ threadId, projectId, agentName: threadAgentName });
	}, [
		agentLocked,
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
