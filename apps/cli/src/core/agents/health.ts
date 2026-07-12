import { pingAcpAgent } from "@/core/acp/ping";
import { type EnabledAgent, listAgents } from "@/store/agents";
import type { AgentEntry } from "@/validators/agent";

const HEALTH_CACHE_TTL_MS = 60_000;

export type AgentHealthResult = {
	healthy: boolean;
	error?: string;
};

type HealthEntry = {
	healthy: boolean;
	error?: string;
	checkedAt: number;
};

const healthCache = new Map<string, HealthEntry>();

export async function checkAgentHealth(
	registryId: string,
	entry: AgentEntry
): Promise<AgentHealthResult> {
	const cached = healthCache.get(registryId);
	if (cached && Date.now() - cached.checkedAt < HEALTH_CACHE_TTL_MS)
		return { healthy: cached.healthy, error: cached.error };

	const result = await pingAcpAgent(registryId, entry);
	const health = result.match<AgentHealthResult>({
		ok: () => ({ healthy: true }),
		err: (error) => ({ healthy: false, error }),
	});
	healthCache.set(registryId, { ...health, checkedAt: Date.now() });
	return health;
}

export async function listHealthyAgents(): Promise<EnabledAgent[]> {
	const registry = await listAgents();
	if (registry.isErr()) return [];

	const entries = Object.entries(registry.value).sort(([a], [b]) =>
		a.localeCompare(b)
	);
	const results = await Promise.all(
		entries.map(async ([id, entry]) => ({
			agent: {
				id,
				name: entry.name,
				icon: entry.icon,
			},
			health: await checkAgentHealth(id, entry),
		}))
	);

	return results
		.filter(({ health }) => health.healthy)
		.map(({ agent }) => agent);
}

export function clearHealthCache(): void {
	healthCache.clear();
}

export function setHealthCacheForTest(
	registryId: string,
	healthy: boolean,
	error?: string
): void {
	healthCache.set(registryId, {
		healthy,
		error,
		checkedAt: Date.now(),
	});
}
