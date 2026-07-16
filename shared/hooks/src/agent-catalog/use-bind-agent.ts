import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type {
	AvailableCommand,
	ContextUsage,
} from "@cyrus/schemas/rtc/catalog";
import type { ListThreadsOutput } from "@cyrus/schemas/rtc/threads";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRtc } from "../contexts/rtc";
import { useAgentCatalogStore } from "../stores/agent-catalog";
import type { CatalogQueryKeys } from "./selectors";

type UseBindAgentOptions = {
	threadId: string;
	keys: Pick<CatalogQueryKeys, "threads" | "contextUsage">;
	capabilities: Record<string, unknown> | undefined;
	commands: AvailableCommand[];
	contextUsage: ContextUsage | null | undefined;
};

/** Owns the bind-agent mutation: optimistic thread/catalog snapshotting + rollback. */
export function useBindAgent({
	threadId,
	keys,
	capabilities,
	commands,
	contextUsage,
}: UseBindAgentOptions) {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();

	const setCapabilities = useAgentCatalogStore(
		(state) => state.setCapabilities
	);
	const setCommands = useAgentCatalogStore((state) => state.setCommands);
	const setContextUsage = useAgentCatalogStore(
		(state) => state.setContextUsage
	);
	const setPendingAgent = useAgentCatalogStore(
		(state) => state.setPendingAgent
	);
	const clearPendingAgent = useAgentCatalogStore(
		(state) => state.clearPendingAgent
	);
	const setLiveBinding = useAgentCatalogStore((state) => state.setLiveBinding);
	const clearLiveBinding = useAgentCatalogStore(
		(state) => state.clearLiveBinding
	);
	const clearResumeBindRequested = useAgentCatalogStore(
		(state) => state.clearResumeBindRequested
	);

	const bindAgentMutation = useMutation({
		...orpcController.bindAgent.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.bindAgent,
		}),
		onMutate: async (variables) => {
			setPendingAgent(threadId, variables.agentName);
			const currentLive =
				useAgentCatalogStore.getState().liveBindingByThread[threadId];
			if (currentLive && currentLive.agentName !== variables.agentName) {
				clearLiveBinding(threadId);
			}
			await queryClient.cancelQueries({ queryKey: keys.threads });
			const previousThreads = queryClient.getQueryData<ListThreadsOutput>(
				keys.threads
			);
			const previousAgent =
				currentLive?.agentName ??
				previousThreads?.threads.find((item) => item.id === threadId)
					?.agentName;
			const previousCapabilities = capabilities;
			const previousCommands = commands;
			const previousUsage = contextUsage;
			if (previousAgent && previousAgent !== variables.agentName) {
				setCapabilities(threadId, {});
				setCommands(threadId, []);
				setContextUsage(threadId, null);
			}
			return {
				previousThreads,
				previousCapabilities,
				previousCommands,
				previousUsage,
			};
		},
		onSuccess: (data, variables) => {
			const agentName = variables.agentName;
			setLiveBinding(threadId, {
				agentName,
				sessionId: data.sessionId,
			});
			queryClient.setQueryData(
				RTC_OPERATION_KEYS.getModels(threadId, agentName),
				{ models: data.models }
			);
			queryClient.setQueryData(
				RTC_OPERATION_KEYS.getModes(threadId, agentName),
				{ modes: data.modes }
			);
			queryClient.setQueryData(
				RTC_OPERATION_KEYS.getEfforts(threadId, agentName),
				{ efforts: data.efforts }
			);
			queryClient.setQueryData(
				RTC_OPERATION_KEYS.getPersona(threadId, agentName),
				{ personas: data.personas }
			);
			setCapabilities(threadId, data.capabilities);
			setCommands(threadId, data.commands ?? []);
			if (data.agentLocked) {
				queryClient.invalidateQueries({ queryKey: keys.threads });
			}
			queryClient.invalidateQueries({ queryKey: keys.contextUsage });
		},
		onError: (_error, _variables, context) => {
			clearLiveBinding(threadId);
			if (context?.previousThreads) {
				queryClient.setQueryData(keys.threads, context.previousThreads);
			}
			if (context?.previousCapabilities) {
				setCapabilities(threadId, context.previousCapabilities);
			}
			if (context?.previousCommands) {
				setCommands(threadId, context.previousCommands);
			}
			if (context && "previousUsage" in context) {
				setContextUsage(threadId, context.previousUsage ?? null);
			}
		},
		onSettled: () => {
			clearPendingAgent(threadId);
			clearResumeBindRequested(threadId);
		},
	});

	// Reset scoped to thread switches only — mutation identity changes each render.
	// biome-ignore lint/correctness/useExhaustiveDependencies: threadId is the intentional trigger
	useEffect(() => {
		bindAgentMutation.reset();
	}, [threadId]);

	return bindAgentMutation;
}
