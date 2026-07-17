import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Result } from "better-result";
import { useCallback, useEffect } from "react";
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
import { useCatalogQueries } from "./use-catalog-queries";
import { useDraftCatalog } from "./use-draft-catalog";

type UseAgentCatalogOptions = {
	threadId: string;
	projectId: string;
	agents: CatalogOption[];
	/** Controller-local draft: no server thread row; skip listThreads. */
	localDraft?: boolean;
};

export function useAgentCatalog({
	threadId,
	projectId,
	agents,
	localDraft = false,
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
	const setPendingAgent = useAgentCatalogStore(
		(state) => state.setPendingAgent
	);
	const setCapabilities = useAgentCatalogStore(
		(state) => state.setCapabilities
	);
	const setCommands = useAgentCatalogStore((state) => state.setCommands);
	const setContextUsage = useAgentCatalogStore(
		(state) => state.setContextUsage
	);

	const threadsQueryKey = RTC_OPERATION_KEYS.listThreads(projectId);
	const threadsQuery = useQuery({
		...orpcController.listThreads.queryOptions({
			queryKey: threadsQueryKey,
			input: { projectId },
		}),
		queryKey: threadsQueryKey,
		enabled: !localDraft,
	});
	const thread = localDraft
		? undefined
		: threadsQuery.data?.threads.find((item) => item.id === threadId);
	const agentLocked = Boolean(thread?.agentLocked);
	const isDraft = localDraft || !agentLocked;
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

	const hasLiveOrPersistedSession = Boolean(
		liveBinding?.sessionId || persistedSessionId
	);
	const threadCatalogEnabled =
		!isDraft && Boolean(hasLiveOrPersistedSession && catalogAgent);

	const draftCatalog = useDraftCatalog({
		isDraft,
		catalogAgent,
		projectId,
		threadId,
	});

	const {
		models: threadModels,
		modes: threadModes,
		efforts: threadEfforts,
		personas: threadPersonas,
		modelsQuery,
	} = useCatalogQueries({
		threadId,
		catalogAgent,
		catalogEnabled: threadCatalogEnabled,
		contextUsageEnabled: threadCatalogEnabled,
		keys,
	});

	const models = isDraft ? draftCatalog.models : threadModels;
	const modes = isDraft ? draftCatalog.modes : threadModes;
	const efforts = isDraft ? draftCatalog.efforts : threadEfforts;
	const personas = isDraft ? draftCatalog.personas : threadPersonas;

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

	useEffect(() => {
		if (!isDraft) return;
		if (pendingAgent) return;
		const defaultAgent = agents[0]?.id;
		if (!defaultAgent) return;
		setPendingAgent(threadId, defaultAgent);
	}, [agents, isDraft, pendingAgent, setPendingAgent, threadId]);

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
		(isDraft
			? draftCatalog.isFetching
			: threadCatalogEnabled && modelsQuery.isFetching);

	function selectAgent(agentName: string) {
		if (agentLocked) return;
		if (!isDraft) return;
		if (agentName === catalogAgent && draftCatalog.error) {
			queryClient.invalidateQueries({ queryKey: draftCatalog.queryKey });
			return;
		}
		if (boundAgent && agentName === boundAgent) return;
		setPendingAgent(threadId, agentName);
		setCapabilities(threadId, {});
		setCommands(threadId, []);
		setContextUsage(threadId, null);
	}

	function selectModel(modelId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setModelSelection(threadId, modelId);
		if (isDraft) return;
		setModelMutation.mutate({ agentName, modelId, projectId, threadId });
	}

	function selectMode(modeId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setModeSelection(threadId, modeId);
		if (isDraft) return;
		setModeMutation.mutate({ agentName, modeId, projectId, threadId });
	}

	function selectEffort(effortId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setEffortSelection(threadId, effortId);
		if (isDraft) return;
		setEffortMutation.mutate({ agentName, effortId, projectId, threadId });
	}

	function selectPersona(personaId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setPersonaSelection(threadId, personaId);
		if (isDraft) return;
		setPersonaMutation.mutate({ agentName, personaId, projectId, threadId });
	}

	const prepareDraftSend = useCallback(() => {
		const agentName =
			liveBinding?.agentName ?? thread?.agentName ?? catalogAgent ?? "";
		if (!agentName) {
			return Promise.resolve(Result.err(new Error("no agent selected")));
		}
		return Promise.resolve(Result.ok(agentName));
	}, [catalogAgent, liveBinding?.agentName, thread?.agentName]);

	return {
		agentLocked,
		catalogError: isDraft ? draftCatalog.error : null,
		capabilities,
		commands,
		contextUsage: isDraft ? null : contextUsage,
		displayAgent,
		displayEffort,
		displayMode,
		displayModel,
		displayPersona,
		efforts,
		isDraft,
		models,
		modelsLoading,
		modes,
		personas,
		prepareDraftSend,
		promptCapabilities,
		selectAgent,
		selectEffort,
		selectMode,
		selectModel,
		selectPersona,
	};
}
