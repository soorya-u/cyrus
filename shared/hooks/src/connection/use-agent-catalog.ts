import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { ListThreadsOutput } from "@cyrus/schemas/rtc/threads";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { useRtc } from "../contexts/rtc";
import { useAgentCatalogStore } from "../stores/agent-catalog";

type CatalogOption = { id: string; name: string };

function pickExplicitOption(
	id: string | undefined,
	options: CatalogOption[]
): string {
	if (!id) return "";
	return options.some((option) => option.id === id) ? id : "";
}

function pickDisplayOption(
	id: string | undefined,
	options: CatalogOption[]
): string {
	if (id && options.some((option) => option.id === id)) return id;
	return options[0]?.id ?? "";
}

type UseAgentCatalogOptions = {
	threadId: string;
	projectId: string;
	agents: CatalogOption[];
};

export function useAgentCatalog({
	threadId,
	projectId,
	agents,
}: UseAgentCatalogOptions) {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();

	const selection = useAgentCatalogStore(
		(state) => state.selectionByThread[threadId]
	);
	const pendingAgent = useAgentCatalogStore(
		(state) => state.pendingAgentByThread[threadId]
	);
	const setModelSelection = useAgentCatalogStore((state) => state.setModel);
	const setEffortSelection = useAgentCatalogStore((state) => state.setEffort);
	const setPersonaSelection = useAgentCatalogStore((state) => state.setPersona);
	const setPendingAgent = useAgentCatalogStore(
		(state) => state.setPendingAgent
	);
	const clearPendingAgent = useAgentCatalogStore(
		(state) => state.clearPendingAgent
	);
	const markResumeBindRequested = useAgentCatalogStore(
		(state) => state.markResumeBindRequested
	);
	const resumeBindRequested = useAgentCatalogStore(
		(state) => state.resumeBindRequestedByThread[threadId]
	);

	const threadsQueryKey = RTC_OPERATION_KEYS.listThreads(projectId);
	const threadsQuery = useQuery({
		...orpcController.listThreads.queryOptions({
			queryKey: threadsQueryKey,
			input: { projectId },
		}),
		queryKey: threadsQueryKey,
	});
	const thread = threadsQuery.data?.threads.find(
		(item) => item.id === threadId
	);
	const agentLocked = Boolean(thread?.agentLocked);
	const boundSessionId = thread?.sessionId;

	const boundAgent = pickExplicitOption(
		pendingAgent ?? thread?.agentName,
		agents
	);
	const displayAgent = pickDisplayOption(
		pendingAgent ?? thread?.agentName,
		agents
	);

	const modelsQueryKey = RTC_OPERATION_KEYS.getModels(threadId);
	const effortsQueryKey = RTC_OPERATION_KEYS.getEfforts(threadId);
	const personaQueryKey = RTC_OPERATION_KEYS.getPersona(threadId);

	const bindAgentMutation = useMutation({
		...orpcController.bindAgent.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.bindAgent,
		}),
		onMutate: async (variables) => {
			setPendingAgent(threadId, variables.agentName);
			await queryClient.cancelQueries({ queryKey: threadsQueryKey });
			const previousThreads =
				queryClient.getQueryData<ListThreadsOutput>(threadsQueryKey);
			const previousAgent = previousThreads?.threads.find(
				(item) => item.id === threadId
			)?.agentName;
			if (previousThreads) {
				queryClient.setQueryData<ListThreadsOutput>(threadsQueryKey, {
					...previousThreads,
					threads: previousThreads.threads.map((item) =>
						item.id === threadId
							? { ...item, agentName: variables.agentName }
							: item
					),
				});
			}
			const previousModels = queryClient.getQueryData(modelsQueryKey);
			if (previousAgent && previousAgent !== variables.agentName) {
				queryClient.setQueryData(modelsQueryKey, { models: [] });
			}
			return { previousThreads, previousModels };
		},
		onSuccess: (data) => {
			queryClient.setQueryData(modelsQueryKey, { models: data.models });
			queryClient.setQueryData(effortsQueryKey, { efforts: data.efforts });
			queryClient.setQueryData(personaQueryKey, { personas: data.personas });
			queryClient.invalidateQueries({ queryKey: threadsQueryKey });
		},
		onError: (_error, _variables, context) => {
			if (context?.previousThreads) {
				queryClient.setQueryData(threadsQueryKey, context.previousThreads);
			}
			if (context?.previousModels) {
				queryClient.setQueryData(modelsQueryKey, context.previousModels);
			}
		},
		onSettled: () => {
			clearPendingAgent(threadId);
		},
	});

	const { mutate: bindAgent, isPending: bindAgentPending } = bindAgentMutation;

	const catalogEnabled = Boolean(boundSessionId) && !bindAgentPending;

	const modelsQuery = useQuery({
		...orpcController.getModels.queryOptions({
			queryKey: modelsQueryKey,
			input: { threadId },
		}),
		queryKey: modelsQueryKey,
		enabled: catalogEnabled,
		placeholderData: keepPreviousData,
	});
	const models = modelsQuery.data?.models ?? [];

	const effortsQuery = useQuery({
		...orpcController.getEfforts.queryOptions({
			queryKey: effortsQueryKey,
			input: { threadId },
		}),
		queryKey: effortsQueryKey,
		enabled: catalogEnabled,
		placeholderData: keepPreviousData,
	});
	const efforts = effortsQuery.data?.efforts ?? [];

	const personaQuery = useQuery({
		...orpcController.getPersona.queryOptions({
			queryKey: personaQueryKey,
			input: { threadId },
		}),
		queryKey: personaQueryKey,
		enabled: catalogEnabled,
		placeholderData: keepPreviousData,
	});
	const personas = personaQuery.data?.personas ?? [];

	const displayModel = pickDisplayOption(selection?.modelId, models);
	const displayEffort = pickDisplayOption(selection?.effortId, efforts);
	const displayPersona = pickDisplayOption(selection?.personaId, personas);

	const setModelMutation = useMutation({
		...orpcController.setModel.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.setModel,
		}),
	});
	const setEffortMutation = useMutation({
		...orpcController.setEffort.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.setEffort,
		}),
	});
	const setPersonaMutation = useMutation({
		...orpcController.setPersona.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.setPersona,
		}),
	});

	useEffect(() => {
		if (!(thread?.agentName && boundSessionId) || agentLocked) return;
		if (bindAgentPending || pendingAgent || resumeBindRequested) return;
		if (bindAgentMutation.isError) return;

		const cachedModels = queryClient.getQueryData<{ models: unknown[] }>(
			modelsQueryKey
		);
		if (cachedModels?.models?.length) return;

		markResumeBindRequested(threadId);
		bindAgent({
			threadId,
			projectId,
			agentName: thread.agentName,
		});
	}, [
		agentLocked,
		bindAgent,
		bindAgentMutation.isError,
		bindAgentPending,
		boundSessionId,
		markResumeBindRequested,
		modelsQueryKey,
		pendingAgent,
		projectId,
		queryClient,
		resumeBindRequested,
		thread?.agentName,
		threadId,
	]);

	const modelsLoading =
		models.length === 0 &&
		Boolean(boundAgent || displayAgent) &&
		(bindAgentPending || (catalogEnabled && modelsQuery.isLoading));

	function selectAgent(agentName: string) {
		if (agentLocked || (boundAgent && agentName === boundAgent)) return;
		bindAgentMutation.mutate({ threadId, projectId, agentName });
	}

	function selectModel(modelId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setModelSelection(threadId, modelId);
		setModelMutation.mutate({
			agentName,
			modelId,
			projectId,
			threadId,
		});
	}

	function selectEffort(effortId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setEffortSelection(threadId, effortId);
		setEffortMutation.mutate({
			agentName,
			effortId,
			projectId,
			threadId,
		});
	}

	function selectPersona(personaId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setPersonaSelection(threadId, personaId);
		setPersonaMutation.mutate({
			agentName,
			personaId,
			projectId,
			threadId,
		});
	}

	return {
		agentLocked,
		displayAgent,
		displayEffort,
		displayModel,
		displayPersona,
		efforts,
		models,
		modelsLoading,
		personas,
		selectAgent,
		selectEffort,
		selectModel,
		selectPersona,
	};
}

export type UseAgentCatalog = ReturnType<typeof useAgentCatalog>;
