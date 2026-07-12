import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRtc } from "../contexts/rtc";
import { useAgentCatalogStore } from "../stores/agent-catalog";

type CatalogOption = { id: string; name: string };

function pickValid(id: string | undefined, options: CatalogOption[]): string {
	if (id && options.some((option) => option.id === id)) return id;
	return options[0]?.id ?? "";
}

type UseAgentCatalogOptions = {
	threadId: string;
	projectId: string;
};

export function useAgentCatalog({
	threadId,
	projectId,
}: UseAgentCatalogOptions) {
	const queryClient = useQueryClient();
	const { orpc: orpcController } = useRtc();

	const selection = useAgentCatalogStore(
		(state) => state.selectionByThread[threadId]
	);
	const setModelSelection = useAgentCatalogStore((state) => state.setModel);
	const setEffortSelection = useAgentCatalogStore((state) => state.setEffort);
	const setPersonaSelection = useAgentCatalogStore((state) => state.setPersona);

	const threadsQuery = useQuery({
		...orpcController.listThreads.queryOptions({
			queryKey: RTC_OPERATION_KEYS.listThreads(projectId),
			input: { projectId },
		}),
		queryKey: RTC_OPERATION_KEYS.listThreads(projectId),
	});
	const thread = threadsQuery.data?.threads.find(
		(item) => item.id === threadId
	);
	const agentLocked = Boolean(thread?.agentLocked);
	const boundSessionId = thread?.sessionId;

	const agentsQuery = useQuery({
		...orpcController.listAgents.queryOptions({
			queryKey: RTC_OPERATION_KEYS.listAgents,
		}),
		queryKey: RTC_OPERATION_KEYS.listAgents,
	});
	const agents = agentsQuery.data?.agents ?? [];
	const selectedAgent = pickValid(thread?.agentName, agents);

	const catalogEnabled = Boolean(boundSessionId);

	const modelsQueryKey = RTC_OPERATION_KEYS.getModels(threadId);
	const modelsQuery = useQuery({
		...orpcController.getModels.queryOptions({
			queryKey: modelsQueryKey,
			input: { threadId },
		}),
		queryKey: modelsQueryKey,
		enabled: catalogEnabled,
	});
	const models = modelsQuery.data?.models ?? [];

	const effortsQueryKey = RTC_OPERATION_KEYS.getEfforts(threadId);
	const effortsQuery = useQuery({
		...orpcController.getEfforts.queryOptions({
			queryKey: effortsQueryKey,
			input: { threadId },
		}),
		queryKey: effortsQueryKey,
		enabled: catalogEnabled,
	});
	const efforts = effortsQuery.data?.efforts ?? [];

	const personaQueryKey = RTC_OPERATION_KEYS.getPersona(threadId);
	const personaQuery = useQuery({
		...orpcController.getPersona.queryOptions({
			queryKey: personaQueryKey,
			input: { threadId },
		}),
		queryKey: personaQueryKey,
		enabled: catalogEnabled,
	});
	const personas = personaQuery.data?.personas ?? [];

	const selectedModel = pickValid(selection?.modelId, models);
	const selectedEffort = pickValid(selection?.effortId, efforts);
	const selectedPersona = pickValid(selection?.personaId, personas);

	const bindAgentMutation = useMutation({
		...orpcController.bindAgent.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.bindAgent,
		}),
		onSuccess: (data) => {
			queryClient.setQueryData(modelsQueryKey, { models: data.models });
			queryClient.setQueryData(effortsQueryKey, { efforts: data.efforts });
			queryClient.setQueryData(personaQueryKey, { personas: data.personas });
			queryClient.invalidateQueries({
				queryKey: RTC_OPERATION_KEYS.listThreads(projectId),
			});
		},
	});

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

	const { mutate: bindAgent, isPending: bindAgentPending } = bindAgentMutation;

	useEffect(() => {
		if (!thread?.agentName || boundSessionId || agentLocked) return;
		if (bindAgentMutation.isError) return;
		if (bindAgentPending) return;
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
		projectId,
		thread?.agentName,
		threadId,
	]);

	function selectAgent(agentName: string) {
		if (agentLocked || agentName === selectedAgent) return;
		bindAgentMutation.mutate({ threadId, projectId, agentName });
	}

	function selectModel(modelId: string) {
		setModelSelection(threadId, modelId);
		setModelMutation.mutate({
			agentName: selectedAgent,
			modelId,
			projectId,
			threadId,
		});
	}

	function selectEffort(effortId: string) {
		setEffortSelection(threadId, effortId);
		setEffortMutation.mutate({
			agentName: selectedAgent,
			effortId,
			projectId,
			threadId,
		});
	}

	function selectPersona(personaId: string) {
		setPersonaSelection(threadId, personaId);
		setPersonaMutation.mutate({
			agentName: selectedAgent,
			personaId,
			projectId,
			threadId,
		});
	}

	return {
		agentLocked,
		agents,
		efforts,
		models,
		modelsLoading:
			modelsQuery.isFetching ||
			bindAgentMutation.isPending ||
			(Boolean(thread?.agentName) &&
				!boundSessionId &&
				!agentLocked &&
				!bindAgentMutation.isError),
		personas,
		selectAgent,
		selectedAgent,
		selectedEffort,
		selectedModel,
		selectedPersona,
		selectEffort,
		selectModel,
		selectPersona,
	};
}

export type UseAgentCatalog = ReturnType<typeof useAgentCatalog>;
