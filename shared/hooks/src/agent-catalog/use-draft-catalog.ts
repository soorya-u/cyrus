import { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { GetDraftCatalogOutput } from "@cyrus/schemas/rtc/catalog";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRtc } from "../contexts/rtc";
import { useAgentCatalogStore } from "../stores/agent-catalog";
import { type CatalogOption, EMPTY_OPTIONS } from "./selectors";

type DraftCatalogSlice = {
	models: CatalogOption[];
	modes: CatalogOption[];
	efforts: CatalogOption[];
	personas: CatalogOption[];
	isFetching: boolean;
	error: Error | null;
	queryKey: ReturnType<typeof RTC_OPERATION_KEYS.getDraftCatalog>;
};

function optionsFromDraft(
	data: GetDraftCatalogOutput | undefined,
	catalogAgent: string,
	field: "models" | "modes" | "efforts" | "personas"
): CatalogOption[] {
	if (!(catalogAgent && data)) return EMPTY_OPTIONS;
	return data[field] ?? EMPTY_OPTIONS;
}

/** Probe-backed catalog for drafts, cached per (agent, project). */
export function useDraftCatalog({
	isDraft,
	catalogAgent,
	projectId,
	threadId,
}: {
	isDraft: boolean;
	catalogAgent: string;
	projectId: string;
	threadId: string;
}): DraftCatalogSlice {
	const { orpc: orpcController } = useRtc();
	const setCapabilities = useAgentCatalogStore(
		(state) => state.setCapabilities
	);
	const setCommands = useAgentCatalogStore((state) => state.setCommands);
	const setContextUsage = useAgentCatalogStore(
		(state) => state.setContextUsage
	);

	const queryKey = RTC_OPERATION_KEYS.getDraftCatalog(
		catalogAgent || "",
		projectId
	);

	const draftCatalogQuery = useQuery({
		...orpcController.getDraftCatalog.queryOptions({
			queryKey,
			input: { agentName: catalogAgent, projectId },
		}),
		queryKey,
		enabled: isDraft && Boolean(catalogAgent),
		staleTime: Number.POSITIVE_INFINITY,
	});

	useEffect(() => {
		if (!(isDraft && draftCatalogQuery.data)) return;
		setCapabilities(threadId, draftCatalogQuery.data.capabilities);
		setCommands(threadId, draftCatalogQuery.data.commands ?? []);
		setContextUsage(threadId, null);
	}, [
		draftCatalogQuery.data,
		isDraft,
		setCapabilities,
		setCommands,
		setContextUsage,
		threadId,
	]);

	return {
		models: optionsFromDraft(draftCatalogQuery.data, catalogAgent, "models"),
		modes: optionsFromDraft(draftCatalogQuery.data, catalogAgent, "modes"),
		efforts: optionsFromDraft(draftCatalogQuery.data, catalogAgent, "efforts"),
		personas: optionsFromDraft(
			draftCatalogQuery.data,
			catalogAgent,
			"personas"
		),
		isFetching: draftCatalogQuery.isFetching,
		error: draftCatalogQuery.error,
		queryKey,
	};
}
