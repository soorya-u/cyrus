import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRtc } from "../contexts/rtc";
import { useAgentCatalogStore } from "../stores/agent-catalog";
import { type CatalogQueryKeys, EMPTY_OPTIONS } from "./selectors";

type UseCatalogQueriesOptions = {
	threadId: string;
	catalogAgent: string;
	catalogEnabled: boolean;
	keys: CatalogQueryKeys;
};

/** The five per-agent catalog reads (models/modes/efforts/personas/usage). */
export function useCatalogQueries({
	threadId,
	catalogAgent,
	catalogEnabled,
	keys,
}: UseCatalogQueriesOptions) {
	const { orpc: orpcController } = useRtc();
	const setContextUsage = useAgentCatalogStore(
		(state) => state.setContextUsage
	);

	const modelsQuery = useQuery({
		...orpcController.getModels.queryOptions({
			queryKey: keys.models,
			input: { threadId },
		}),
		queryKey: keys.models,
		enabled: catalogEnabled,
	});
	const models = catalogAgent
		? (modelsQuery.data?.models ?? EMPTY_OPTIONS)
		: EMPTY_OPTIONS;

	const modesQuery = useQuery({
		...orpcController.getModes.queryOptions({
			queryKey: keys.modes,
			input: { threadId },
		}),
		queryKey: keys.modes,
		enabled: catalogEnabled,
	});
	const modes = catalogAgent
		? (modesQuery.data?.modes ?? EMPTY_OPTIONS)
		: EMPTY_OPTIONS;

	const effortsQuery = useQuery({
		...orpcController.getEfforts.queryOptions({
			queryKey: keys.efforts,
			input: { threadId },
		}),
		queryKey: keys.efforts,
		enabled: catalogEnabled,
	});
	const efforts = catalogAgent
		? (effortsQuery.data?.efforts ?? EMPTY_OPTIONS)
		: EMPTY_OPTIONS;

	const personaQuery = useQuery({
		...orpcController.getPersona.queryOptions({
			queryKey: keys.persona,
			input: { threadId },
		}),
		queryKey: keys.persona,
		enabled: catalogEnabled,
	});
	const personas = catalogAgent
		? (personaQuery.data?.personas ?? EMPTY_OPTIONS)
		: EMPTY_OPTIONS;

	const contextUsageQuery = useQuery({
		...orpcController.getContextUsage.queryOptions({
			queryKey: keys.contextUsage,
			input: { threadId },
		}),
		queryKey: keys.contextUsage,
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

	return { models, modes, efforts, personas, modelsQuery };
}
