import { writeFile } from "node:fs/promises";
import { Result } from "better-result";
import { YAML } from "bun";
import {
	type CyrusPaths,
	type CyrusStoreOptions,
	defaultCyrusPaths,
} from "@/constants/paths";
import type { AgentEntry } from "@/validators/agent";
import { agentEntrySchema } from "@/validators/agent";
import { ensureDir } from "../utils/dir";
import { toMessage } from "../utils/error";

type AgentsRegistry = Record<string, AgentEntry>;

function resolvePaths(options?: CyrusStoreOptions): CyrusPaths {
	return options?.paths ?? defaultCyrusPaths();
}

async function readRegistry(
	options?: CyrusStoreOptions
): Promise<Result<AgentsRegistry, string>> {
	const { agentsPath } = resolvePaths(options);
	const file = Bun.file(agentsPath);
	if (!(await file.exists())) return Result.ok({});

	return (
		await Result.tryPromise(async () => {
			const parsed = YAML.parse(await file.text());
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				throw new Error(
					"agents.yml must be a mapping of registry ids to entries"
				);
			}
			const registry: AgentsRegistry = {};
			for (const [id, value] of Object.entries(parsed)) {
				const entry = agentEntrySchema.safeParse(value);
				if (!entry.success)
					throw new Error(`invalid entry for agent "${id}" in agents.yml`);

				if (entry.data.registryId !== id)
					throw new Error(
						`agents.yml key "${id}" does not match registryId "${entry.data.registryId}"`
					);

				registry[id] = entry.data;
			}
			return registry;
		})
	).mapError(toMessage);
}

async function writeRegistry(
	registry: AgentsRegistry,
	options?: CyrusStoreOptions
): Promise<Result<void, string>> {
	const paths = resolvePaths(options);
	return (
		await Result.tryPromise(async () => {
			await ensureDir(paths.home);
			await writeFile(paths.agentsPath, YAML.stringify(registry), {
				mode: 0o600,
			});
		})
	).mapError(toMessage);
}

export function listAgents(
	options?: CyrusStoreOptions
): Promise<Result<AgentsRegistry, string>> {
	return readRegistry(options);
}

export async function getAgent(
	id: string,
	options?: CyrusStoreOptions
): Promise<Result<AgentEntry | null, string>> {
	const registry = await readRegistry(options);
	return registry.map((agents) => agents[id] ?? null);
}

export async function addAgent(
	id: string,
	entry: AgentEntry,
	options?: CyrusStoreOptions
): Promise<Result<void, string>> {
	const registry = await readRegistry(options);
	if (registry.isErr()) return Result.err(registry.error);

	const agents = registry.value;
	if (agents[id]) {
		return Result.err(`agent "${id}" is already enabled`);
	}
	agents[id] = entry;
	return writeRegistry(agents, options);
}

export async function removeAgent(
	id: string,
	options?: CyrusStoreOptions
): Promise<Result<void, string>> {
	const registry = await readRegistry(options);
	if (registry.isErr()) return Result.err(registry.error);

	const agents = registry.value;
	if (!agents[id]) {
		return Result.err(`agent "${id}" is not enabled`);
	}
	delete agents[id];
	return writeRegistry(agents, options);
}

export type EnabledAgent = {
	id: string;
	name: string;
	icon: string;
};

/** All enabled agents from agents.yml for listAgents / composer. */
export async function listEnabledAgents(
	options?: CyrusStoreOptions
): Promise<EnabledAgent[]> {
	const registry = await readRegistry(options);
	if (registry.isErr()) return [];

	return Object.entries(registry.value)
		.map(([id, entry]) => ({
			id,
			name: entry.name,
			icon: entry.icon,
		}))
		.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listEnabledAgentIds(
	options?: CyrusStoreOptions
): Promise<Set<string>> {
	const registry = await readRegistry(options);
	if (registry.isErr()) return new Set();
	return new Set(Object.keys(registry.value));
}
