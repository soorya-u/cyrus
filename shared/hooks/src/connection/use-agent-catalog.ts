import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useMutation, useQuery } from "@tanstack/react-query";
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
	const { orpc: orpcController } = useRtc();

	const selection = useAgentCatalogStore(
		(state) => state.selectionByThread[threadId]
	);
	const setAgentSelection = useAgentCatalogStore((state) => state.setAgent);
	const setModelSelection = useAgentCatalogStore((state) => state.setModel);
	const setEffortSelection = useAgentCatalogStore((state) => state.setEffort);
	const setPersonaSelection = useAgentCatalogStore((state) => state.setPersona);

	const agentsQuery = useQuery({
		...orpcController.listAgents.queryOptions({
			queryKey: RTC_OPERATION_KEYS.listAgents,
		}),
		queryKey: RTC_OPERATION_KEYS.listAgents,
	});
	const agents = agentsQuery.data?.agents ?? [];
	const selectedAgent = pickValid(selection?.agentName, agents);

	const modelsQueryKey = RTC_OPERATION_KEYS.getModels(selectedAgent);
	const modelsQuery = useQuery({
		...orpcController.getModels.queryOptions({
			queryKey: modelsQueryKey,
			input: { agentName: selectedAgent },
		}),
		queryKey: modelsQueryKey,
		enabled: Boolean(selectedAgent),
	});
	const models = modelsQuery.data?.models ?? [];

	const effortsQueryKey = RTC_OPERATION_KEYS.getEfforts(selectedAgent);
	const effortsQuery = useQuery({
		...orpcController.getEfforts.queryOptions({
			queryKey: effortsQueryKey,
			input: { agentName: selectedAgent },
		}),
		queryKey: effortsQueryKey,
		enabled: Boolean(selectedAgent),
	});
	const efforts = effortsQuery.data?.efforts ?? [];

	const personaQueryKey = RTC_OPERATION_KEYS.getPersona(selectedAgent);
	const personaQuery = useQuery({
		...orpcController.getPersona.queryOptions({
			queryKey: personaQueryKey,
			input: { agentName: selectedAgent },
		}),
		queryKey: personaQueryKey,
		enabled: Boolean(selectedAgent),
	});
	const personas = personaQuery.data?.personas ?? [];

	const selectedModel = pickValid(selection?.modelId, models);
	const selectedEffort = pickValid(selection?.effortId, efforts);
	const selectedPersona = pickValid(selection?.personaId, personas);

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

	function selectAgent(agentName: string) {
		setAgentSelection(threadId, agentName);
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
		agents,
		efforts,
		models,
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
