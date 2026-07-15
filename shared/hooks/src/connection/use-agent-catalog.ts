import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { AvailableCommand } from "@cyrus/schemas/rtc/catalog";
import type { ListThreadsOutput } from "@cyrus/schemas/rtc/threads";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRtc } from "../contexts/rtc";
import {
	readPromptCapabilities,
	useAgentCatalogStore,
} from "../stores/agent-catalog";

const EMPTY_COMMANDS: AvailableCommand[] = [];

type CatalogOption = { id: string; name: string };

const EMPTY_OPTIONS: CatalogOption[] = [];

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
	const markResumeBindRequested = useAgentCatalogStore(
		(state) => state.markResumeBindRequested
	);
	const clearResumeBindRequested = useAgentCatalogStore(
		(state) => state.clearResumeBindRequested
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
	const persistedSessionId = agentLocked ? thread?.sessionId : undefined;
	const preferredAgent =
		pendingAgent ??
		liveBinding?.agentName ??
		(agentLocked ? thread?.agentName : undefined);

	const boundAgent = pickExplicitOption(preferredAgent, agents);
	const displayAgent = pickDisplayOption(preferredAgent, agents);
	const catalogAgent = preferredAgent ?? displayAgent;

	const modelsQueryKey = RTC_OPERATION_KEYS.getModels(threadId, catalogAgent);
	const modesQueryKey = RTC_OPERATION_KEYS.getModes(threadId, catalogAgent);
	const effortsQueryKey = RTC_OPERATION_KEYS.getEfforts(threadId, catalogAgent);
	const personaQueryKey = RTC_OPERATION_KEYS.getPersona(threadId, catalogAgent);
	const contextUsageQueryKey = RTC_OPERATION_KEYS.getContextUsage(threadId);

	const bindAgentMutation = useMutation({
		...orpcController.bindAgent.mutationOptions({
			mutationKey: RTC_OPERATION_KEYS.bindAgent,
		}),
		onMutate: async (variables) => {
			const nextModelsKey = RTC_OPERATION_KEYS.getModels(
				threadId,
				variables.agentName
			);
			const nextModesKey = RTC_OPERATION_KEYS.getModes(
				threadId,
				variables.agentName
			);
			const nextEffortsKey = RTC_OPERATION_KEYS.getEfforts(
				threadId,
				variables.agentName
			);
			const nextPersonaKey = RTC_OPERATION_KEYS.getPersona(
				threadId,
				variables.agentName
			);

			setPendingAgent(threadId, variables.agentName);
			const currentLive =
				useAgentCatalogStore.getState().liveBindingByThread[threadId];
			if (currentLive && currentLive.agentName !== variables.agentName) {
				clearLiveBinding(threadId);
			}
			await queryClient.cancelQueries({ queryKey: threadsQueryKey });
			const previousThreads =
				queryClient.getQueryData<ListThreadsOutput>(threadsQueryKey);
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
				nextModelsKey,
				nextModesKey,
				nextEffortsKey,
				nextPersonaKey,
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
				queryClient.invalidateQueries({ queryKey: threadsQueryKey });
			}
			queryClient.invalidateQueries({ queryKey: contextUsageQueryKey });
		},
		onError: (_error, _variables, context) => {
			clearLiveBinding(threadId);
			if (context?.previousThreads) {
				queryClient.setQueryData(threadsQueryKey, context.previousThreads);
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

	const { mutate: bindAgent, isPending: bindAgentPending } = bindAgentMutation;

	const hasLiveOrPersistedSession = Boolean(
		liveBinding?.sessionId || persistedSessionId
	);
	const catalogEnabled =
		Boolean(hasLiveOrPersistedSession && catalogAgent) && !bindAgentPending;

	const modelsQuery = useQuery({
		...orpcController.getModels.queryOptions({
			queryKey: modelsQueryKey,
			input: { threadId },
		}),
		queryKey: modelsQueryKey,
		enabled: catalogEnabled,
	});
	const models = catalogAgent
		? (modelsQuery.data?.models ?? EMPTY_OPTIONS)
		: EMPTY_OPTIONS;

	const modesQuery = useQuery({
		...orpcController.getModes.queryOptions({
			queryKey: modesQueryKey,
			input: { threadId },
		}),
		queryKey: modesQueryKey,
		enabled: catalogEnabled,
	});
	const modes = catalogAgent
		? (modesQuery.data?.modes ?? EMPTY_OPTIONS)
		: EMPTY_OPTIONS;

	const effortsQuery = useQuery({
		...orpcController.getEfforts.queryOptions({
			queryKey: effortsQueryKey,
			input: { threadId },
		}),
		queryKey: effortsQueryKey,
		enabled: catalogEnabled,
	});
	const efforts = catalogAgent
		? (effortsQuery.data?.efforts ?? EMPTY_OPTIONS)
		: EMPTY_OPTIONS;

	const personaQuery = useQuery({
		...orpcController.getPersona.queryOptions({
			queryKey: personaQueryKey,
			input: { threadId },
		}),
		queryKey: personaQueryKey,
		enabled: catalogEnabled,
	});
	const personas = catalogAgent
		? (personaQuery.data?.personas ?? EMPTY_OPTIONS)
		: EMPTY_OPTIONS;

	const contextUsageQuery = useQuery({
		...orpcController.getContextUsage.queryOptions({
			queryKey: contextUsageQueryKey,
			input: { threadId },
		}),
		queryKey: contextUsageQueryKey,
		enabled: catalogEnabled,
		refetchInterval: catalogEnabled ? 5000 : false,
	});
	useEffect(() => {
		if (!catalogEnabled) return;
		setContextUsage(threadId, contextUsageQuery.data?.usage ?? null);
	}, [
		catalogEnabled,
		contextUsageQuery.data?.usage,
		setContextUsage,
		threadId,
	]);

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
			queryClient.invalidateQueries({ queryKey: effortsQueryKey });
			queryClient.invalidateQueries({ queryKey: personaQueryKey });
			queryClient.invalidateQueries({ queryKey: modelsQueryKey });
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
		bindAgentMutation.reset();
		// Reset scoped to thread switches only — mutation identity changes each render.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- threadId is the intentional dependency
	}, [threadId]);

	useEffect(() => {
		const store = useAgentCatalogStore.getState();
		if (
			bindAgentPending ||
			store.pendingAgentByThread[threadId] ||
			store.resumeBindRequestedByThread[threadId]
		) {
			return;
		}
		if (bindAgentMutation.isError) return;

		const currentLive = store.liveBindingByThread[threadId];
		if (currentLive) return;

		// Committed threads: rehydrate the persisted session after worker restart.
		if (agentLocked && thread?.agentName && persistedSessionId) {
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
			return;
		}

		// Drafts: bind the first agent; session stays worker-local until first message.
		if (agentLocked) return;
		const defaultAgent = agents[0]?.id;
		if (!defaultAgent) return;

		markResumeBindRequested(threadId);
		bindAgent({
			threadId,
			projectId,
			agentName: defaultAgent,
		});
	}, [
		agentLocked,
		agents,
		bindAgent,
		bindAgentMutation.isError,
		bindAgentPending,
		markResumeBindRequested,
		modelsQueryKey,
		persistedSessionId,
		projectId,
		queryClient,
		thread?.agentName,
		threadId,
	]);

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
		setModelMutation.mutate({
			agentName,
			modelId,
			projectId,
			threadId,
		});
	}

	function selectMode(modeId: string) {
		const agentName = boundAgent || displayAgent;
		if (!agentName) return;
		setModeSelection(threadId, modeId);
		setModeMutation.mutate({
			agentName,
			modeId,
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

export type UseAgentCatalog = ReturnType<typeof useAgentCatalog>;
