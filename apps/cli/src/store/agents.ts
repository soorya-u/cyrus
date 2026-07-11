import { writeFile } from "node:fs/promises";
import { Result } from "better-result";
import { YAML } from "bun";
import { AGENTS_PATH } from "@/constants/paths";
import type { AgentEntry } from "@/validators/agent";
import { agentEntrySchema } from "@/validators/agent";
import { ensureDir } from "../utils/dir";
import { toMessage } from "../utils/error";

type AgentsRegistry = Record<string, AgentEntry>;

async function readRegistry(): Promise<Result<AgentsRegistry, string>> {
	const file = Bun.file(AGENTS_PATH);
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
				if (!entry.success) {
					throw new Error(`invalid entry for agent "${id}" in agents.yml`);
				}
				if (entry.data.registryId !== id) {
					throw new Error(
						`agents.yml key "${id}" does not match registryId "${entry.data.registryId}"`
					);
				}
				registry[id] = entry.data;
			}
			return registry;
		})
	).mapError(toMessage);
}

async function writeRegistry(
	registry: AgentsRegistry
): Promise<Result<void, string>> {
	return (
		await Result.tryPromise(async () => {
			await ensureDir();
			await writeFile(AGENTS_PATH, YAML.stringify(registry), { mode: 0o600 });
		})
	).mapError(toMessage);
}

export function listAgents(): Promise<Result<AgentsRegistry, string>> {
	return readRegistry();
}

export async function getAgent(
	id: string
): Promise<Result<AgentEntry | null, string>> {
	const registry = await readRegistry();
	return registry.map((agents) => agents[id] ?? null);
}

export async function addAgent(
	id: string,
	entry: AgentEntry
): Promise<Result<void, string>> {
	const registry = await readRegistry();
	if (registry.isErr()) return Result.err(registry.error);

	const agents = registry.value;
	if (agents[id]) {
		return Result.err(`agent "${id}" is already enabled`);
	}
	agents[id] = entry;
	return writeRegistry(agents);
}

export async function removeAgent(id: string): Promise<Result<void, string>> {
	const registry = await readRegistry();
	if (registry.isErr()) return Result.err(registry.error);

	const agents = registry.value;
	if (!agents[id]) {
		return Result.err(`agent "${id}" is not enabled`);
	}
	delete agents[id];
	return writeRegistry(agents);
}

export type EnabledAgent = {
	id: string;
	name: string;
	icon: string;
};

/** All enabled agents from agents.yml for listAgents / composer. */
export async function listEnabledAgents(): Promise<EnabledAgent[]> {
	const registry = await readRegistry();
	if (registry.isErr()) return [];

	return Object.entries(registry.value)
		.map(([id, entry]) => ({
			id,
			name: entry.name,
			icon: entry.icon,
		}))
		.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listEnabledAgentIds(): Promise<Set<string>> {
	const registry = await readRegistry();
	if (registry.isErr()) return new Set();
	return new Set(Object.keys(registry.value));
}
