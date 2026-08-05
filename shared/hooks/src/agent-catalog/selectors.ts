import type { RTC_OPERATION_KEYS } from "@cyrus/constants/operation-keys";
import type { AvailableCommand } from "@cyrus/schemas/rtc/catalog";

export type CatalogOption = { id: string; name: string };

export const EMPTY_OPTIONS: CatalogOption[] = [];
export const EMPTY_COMMANDS: AvailableCommand[] = [];

export type CatalogQueryKeys = {
	models: ReturnType<typeof RTC_OPERATION_KEYS.getModels>;
	modes: ReturnType<typeof RTC_OPERATION_KEYS.getModes>;
	efforts: ReturnType<typeof RTC_OPERATION_KEYS.getEfforts>;
	persona: ReturnType<typeof RTC_OPERATION_KEYS.getPersona>;
	contextUsage: ReturnType<typeof RTC_OPERATION_KEYS.getContextUsage>;
	threads: ReturnType<typeof RTC_OPERATION_KEYS.listThreads>;
};

export function pickExplicitOption(
	id: string | undefined,
	options: CatalogOption[]
): string {
	if (!id) return "";
	return options.some((option) => option.id === id) ? id : "";
}

export function pickDisplayOption(
	id: string | undefined,
	options: CatalogOption[]
): string {
	if (id && options.some((option) => option.id === id)) return id;
	return options[0]?.id ?? "";
}

/**
 * Draft catalog probes stay gated on `catalogArmed` (set on first user
 * interaction) even once `pendingAgent` defaults to agents[0], so a default
 * selection alone never fires the getDraftCatalog RPC.
 */
export function pickCatalogAgent(options: {
	isDraft: boolean;
	catalogArmed: boolean;
	pendingAgent: string | undefined;
	preferredAgent: string | undefined;
	displayAgent: string;
}): string {
	if (!options.isDraft) {
		return options.preferredAgent ?? options.displayAgent;
	}
	return options.catalogArmed ? (options.pendingAgent ?? "") : "";
}
