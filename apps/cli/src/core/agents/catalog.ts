import type { RuntimeSession } from "@acp-kit/core";
import type {
	SessionConfigOption,
	SessionConfigSelectOption,
	SessionConfigSelectOptions,
	SessionMode,
} from "@agentclientprotocol/sdk";
import type { ModelOption } from "@cyrus/schemas/rtc/catalog";
import type { SelectOption } from "@cyrus/schemas/rtc/common";

export type AgentCatalog = {
	modes: SessionMode[];
	configOptions: SessionConfigOption[];
};

export function catalogFromSession(session: RuntimeSession): AgentCatalog {
	const { session: meta } = session.transcript;
	return {
		modes: meta.modes?.availableModes ?? [],
		configOptions: meta.configOptions,
	};
}

export function modelsFromSession(session: RuntimeSession): ModelOption[] {
	const { session: meta } = session.transcript;
	const fromModels = meta.models?.availableModels;
	if (fromModels && fromModels.length > 0) {
		return fromModels.map((model) => ({
			id: model.modelId,
			name: model.name,
			description: model.description ?? null,
			context: model._meta ?? null,
		}));
	}
	return configOptionsToModels(meta.configOptions);
}

export function modesFromSession(session: RuntimeSession): SelectOption[] {
	return modesToOptions(catalogFromSession(session).modes);
}

export function effortsFromSession(session: RuntimeSession): SelectOption[] {
	return configOptionsToEfforts(catalogFromSession(session).configOptions);
}

export function personasFromSession(session: RuntimeSession): SelectOption[] {
	return configOptionsToPersonas(catalogFromSession(session).configOptions);
}

export function modesToOptions(modes: SessionMode[]): SelectOption[] {
	return modes.map((mode) => ({
		id: mode.id,
		name: mode.name,
		description: mode.description,
	}));
}

export function configOptionsToModels(
	options: SessionConfigOption[]
): ModelOption[] {
	const config = findSelectConfigOption(options, "model");
	if (!config) return [];

	return flattenSelectOptions(config.options).map((option) => ({
		id: option.value,
		name: option.name,
		description: option.description,
		context: option._meta ?? null,
	}));
}

export function configOptionsToEfforts(
	options: SessionConfigOption[]
): SelectOption[] {
	const config = findSelectConfigOption(options, "thought_level");
	if (!config) return [];
	return selectOptionsToList(config.options);
}

export function configOptionsToPersonas(
	options: SessionConfigOption[]
): SelectOption[] {
	const config =
		findSelectConfigOption(options, "persona") ??
		options.find(
			(option) =>
				option.type === "select" &&
				(option.category?.includes("persona") ||
					option.id.toLowerCase().includes("persona"))
		);
	if (!config || config.type !== "select") return [];
	return selectOptionsToList(config.options);
}

export function findSelectConfigOption(
	options: SessionConfigOption[],
	category: string
): Extract<SessionConfigOption, { type: "select" }> | undefined {
	const match = options.find(
		(option) => option.type === "select" && option.category === category
	);
	return match?.type === "select" ? match : undefined;
}

export function findSelectConfigOptionId(
	options: SessionConfigOption[],
	category: string
): string | undefined {
	return findSelectConfigOption(options, category)?.id;
}

function selectOptionsToList(
	options: SessionConfigSelectOptions
): SelectOption[] {
	return flattenSelectOptions(options).map((option) => ({
		id: option.value,
		name: option.name,
		description: option.description,
	}));
}

function flattenSelectOptions(
	options: SessionConfigSelectOptions
): SessionConfigSelectOption[] {
	const flattened: SessionConfigSelectOption[] = [];
	for (const option of options) {
		if ("options" in option) {
			flattened.push(...option.options);
			continue;
		}
		flattened.push(option);
	}
	return flattened;
}

function selectOptionValues(
	options: SessionConfigSelectOptions
): SessionConfigSelectOption["value"][] {
	return flattenSelectOptions(options).map((option) => option.value);
}

export function reconcileInvalidSelectConfigOptions(
	options: SessionConfigOption[]
): Array<{ configId: string; value: string }> {
	const resets: Array<{ configId: string; value: string }> = [];

	for (const option of options) {
		if (option.type !== "select") continue;
		const validValues = new Set(selectOptionValues(option.options));
		if (validValues.size === 0) continue;
		if (validValues.has(option.currentValue)) continue;
		const fallback = [...validValues][0];
		if (!fallback) continue;
		resets.push({ configId: option.id, value: fallback });
	}

	return resets;
}
