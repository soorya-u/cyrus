import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { RTC_OPERATION_KEYS } from "@/constants/operation-keys";
import type { OrpcController } from "@/lib/orpc";
import { useAgentCatalogStore } from "@/stores/agent-catalog";

type CatalogOption = { id: string; name: string };

function pickValid(id: string | undefined, options: CatalogOption[]): string {
	if (id && options.some((option) => option.id === id)) return id;
	return options[0]?.id ?? "";
}

type UseAgentCatalogOptions = {
	threadId: string;
	projectId: string;
};

// wires the composer's agent/model/effort/persona pickers to the real
// listAgents/getModels/getEfforts/getPersona/setModel/setEffort/setPersona
// RPCs. The "currently selected" value has no server-side concept (the
// get* RPCs only return the option list), so selection is tracked
// client-side per thread in useAgentCatalogStore.
export function useAgentCatalog({
	threadId,
	projectId,
}: UseAgentCatalogOptions) {
	const { orpcController } = useRouteContext({ strict: false }) as {
		orpcController?: OrpcController;
	};

	const agentByThread = useAgentCatalogStore((state) => state.agentByThread);
	const modelByThread = useAgentCatalogStore((state) => state.modelByThread);
	const effortByThread = useAgentCatalogStore((state) => state.effortByThread);
	const personaByThread = useAgentCatalogStore(
		(state) => state.personaByThread
	);
	const setAgentSelection = useAgentCatalogStore((state) => state.setAgent);
	const setModelSelection = useAgentCatalogStore((state) => state.setModel);
	const setEffortSelection = useAgentCatalogStore((state) => state.setEffort);
	const setPersonaSelection = useAgentCatalogStore((state) => state.setPersona);

	const agentsQuery = useQuery({
		...orpcController?.listAgents.queryOptions({
			queryKey: RTC_OPERATION_KEYS.listAgents,
		}),
		queryKey: RTC_OPERATION_KEYS.listAgents,
		enabled: Boolean(orpcController),
	});
	const agents = agentsQuery.data?.agents ?? [];
	const selectedAgent = agentByThread[threadId] ?? agents[0]?.name ?? "";

	const modelsQueryKey = RTC_OPERATION_KEYS.getModels(selectedAgent);
	const modelsQuery = useQuery({
		...orpcController?.getModels.queryOptions({
			queryKey: modelsQueryKey,
			input: { agentName: selectedAgent },
		}),
		queryKey: modelsQueryKey,
		enabled: Boolean(orpcController && selectedAgent),
	});
	const models = modelsQuery.data?.models ?? [];

	const effortsQueryKey = RTC_OPERATION_KEYS.getEfforts(selectedAgent);
	const effortsQuery = useQuery({
		...orpcController?.getEfforts.queryOptions({
			queryKey: effortsQueryKey,
			input: { agentName: selectedAgent },
		}),
		queryKey: effortsQueryKey,
		enabled: Boolean(orpcController && selectedAgent),
	});
	const efforts = effortsQuery.data?.efforts ?? [];

	const personaQueryKey = RTC_OPERATION_KEYS.getPersona(selectedAgent);
	const personaQuery = useQuery({
		...orpcController?.getPersona.queryOptions({
			queryKey: personaQueryKey,
			input: { agentName: selectedAgent },
		}),
		queryKey: personaQueryKey,
		enabled: Boolean(orpcController && selectedAgent),
	});
	const personas = personaQuery.data?.personas ?? [];

	const selectedModel = pickValid(modelByThread[threadId], models);
	const selectedEffort = pickValid(effortByThread[threadId], efforts);
	const selectedPersona = pickValid(personaByThread[threadId], personas);

	const setModelMutation = useMutation({
		...orpcController?.setModel.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.setModel,
		}),
	});
	const setEffortMutation = useMutation({
		...orpcController?.setEffort.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.setEffort,
		}),
	});
	const setPersonaMutation = useMutation({
		...orpcController?.setPersona.mutationOptions({
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
