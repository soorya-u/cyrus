import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRtc } from "../contexts/rtc";
import {
	readPromptCapabilities,
	useAgentCatalogStore,
} from "../stores/agent-catalog";
import {
	type CatalogOption,
	type CatalogQueryKeys,
	EMPTY_COMMANDS,
	pickDisplayOption,
	pickExplicitOption,
} from "./selectors";
import { useAutoBind } from "./use-auto-bind";
import { useBindAgent } from "./use-bind-agent";
import { useCatalogQueries } from "./use-catalog-queries";

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
	const capabilities = useAgentCatalogStore(
		(state) => state.capabilitiesByThread[threadId]
	);
	const commands = useAgentCatalogStore(
		(state) => state.commandsByThread[threadId] ?? EMPTY_COMMANDS
	);
	const contextUsage = useAgentCatalogStore(
		(state) => state.contextUsageByThread[threadId]
	);
	const pendingAgent = useAgentCatalogStore(
		(state) => state.pendingAgentByThread[threadId]
	);
	const liveBinding = useAgentCatalogStore(
		(state) => state.liveBindingByThread[threadId]
	);
	const setModelSelection = useAgentCatalogStore((state) => state.setModel);
	const setModeSelection = useAgentCatalogStore((state) => state.setMode);
	const setEffortSelection = useAgentCatalogStore((state) => state.setEffort);
	const setPersonaSelection = useAgentCatalogStore((state) => state.setPersona);

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
	const persistedSessionId = agentLocked ? thread?.sessionId : undefined;
	const preferredAgent =
		pendingAgent ??
		liveBinding?.agentName ??
		(agentLocked ? thread?.agentName : undefined);

	const boundAgent = pickExplicitOption(preferredAgent, agents);
	const displayAgent = pickDisplayOption(preferredAgent, agents);
	const catalogAgent = preferredAgent ?? displayAgent;

	const keys: CatalogQueryKeys = {
		models: RTC_OPERATION_KEYS.getModels(threadId, catalogAgent),
		modes: RTC_OPERATION_KEYS.getModes(threadId, catalogAgent),
		efforts: RTC_OPERATION_KEYS.getEfforts(threadId, catalogAgent),
		persona: RTC_OPERATION_KEYS.getPersona(threadId, catalogAgent),
		contextUsage: RTC_OPERATION_KEYS.getContextUsage(threadId),
		threads: threadsQueryKey,
	};

	const bindAgentMutation = useBindAgent({
		threadId,
		keys,
		capabilities,
		commands,
		contextUsage,
	});
	const { mutate: bindAgent, isPending: bindAgentPending } = bindAgentMutation;

	const hasLiveOrPersistedSession = Boolean(
		liveBinding?.sessionId || persistedSessionId
	);
	const catalogEnabled =
		Boolean(hasLiveOrPersistedSession && catalogAgent) && !bindAgentPending;

	const { models, modes, efforts, personas, modelsQuery } = useCatalogQueries({
		threadId,
		catalogAgent,
		catalogEnabled,
		keys,
	});

	const displayModel = pickDisplayOption(selection?.modelId, models);
	const displayMode = pickDisplayOption(selection?.modeId, modes);
	const displayEffort = pickDisplayOption(selection?.effortId, efforts);
	const displayPersona = pickDisplayOption(selection?.personaId, personas);
	const promptCapabilities = readPromptCapabilities(capabilities);

	const setModelMutation = useMutation({
		...orpcController.setModel.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.setModel,
		}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.efforts });
			queryClient.invalidateQueries({ queryKey: keys.persona });
			queryClient.invalidateQueries({ queryKey: keys.models });
		},
	});
	const setModeMutation = useMutation({
		...orpcController.setMode.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.setMode,
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

	useAutoBind({
		threadId,
		projectId,
		agents,
		agentLocked,
		threadAgentName: thread?.agentName,
		persistedSessionId,
		modelsQueryKey: keys.models,
		bindAgent,
		bindAgentPending,
		bindIsError: bindAgentMutation.isError,
	});

	useEffect(() => {
		if (!catalogAgent || models.length === 0) return;
		const currentModelId =
			useAgentCatalogStore.getState().selectionByThread[threadId]?.modelId;
		if (currentModelId && models.some((model) => model.id === currentModelId)) {
			return;
		}
		const firstModel = models[0];
		if (!firstModel) return;
		setModelSelection(threadId, firstModel.id);
	}, [catalogAgent, models, setModelSelection, threadId]);

	const modelsLoading =
		Boolean(catalogAgent) &&
		models.length === 0 &&
		(bindAgentPending || (catalogEnabled && modelsQuery.isFetching));

	function selectAgent(agentName: string) {
		if (agentLocked || (boundAgent && agentName === boundAgent)) return;
		bindAgentMutation.mutate({ threadId, projectId, agentName });
	}

	function selectModel(modelId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setModelSelection(threadId, modelId);
		setModelMutation.mutate({ agentName, modelId, projectId, threadId });
	}

	function selectMode(modeId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setModeSelection(threadId, modeId);
		setModeMutation.mutate({ agentName, modeId, projectId, threadId });
	}

	function selectEffort(effortId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setEffortSelection(threadId, effortId);
		setEffortMutation.mutate({ agentName, effortId, projectId, threadId });
	}

	function selectPersona(personaId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setPersonaSelection(threadId, personaId);
		setPersonaMutation.mutate({ agentName, personaId, projectId, threadId });
	}

	return {
		agentLocked,
		bindError: bindAgentMutation.error,
		capabilities,
		commands,
		contextUsage,
		displayAgent,
		displayEffort,
		displayMode,
		displayModel,
		displayPersona,
		efforts,
		models,
		modelsLoading,
		modes,
		personas,
		promptCapabilities,
		selectAgent,
		selectEffort,
		selectMode,
		selectModel,
		selectPersona,
	};
}
