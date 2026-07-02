import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Result } from "better-result";
import { YAML } from "bun";
import { AGENTS_FILE } from "@/constants/file";
import { env } from "@/lib/env";
import { isCommandAvailable } from "@/utils/command";
import type { AgentEntry } from "@/validators/agent";
import { agentEntrySchema } from "@/validators/agent";
import { ensureDir } from "../utils/dir";
import { toMessage } from "../utils/error";

const AGENTS_PATH = join(env.CYRUS_HOME, AGENTS_FILE);

type AgentsRegistry = Record<string, AgentEntry>;

async function readRegistry(): Promise<Result<AgentsRegistry, string>> {
	const file = Bun.file(AGENTS_PATH);
	if (!(await file.exists())) return Result.ok({});

	return (
		await Result.tryPromise(async () => {
			const parsed = YAML.parse(await file.text());
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				throw new Error(
					"agents.yml must be a mapping of agent names to entries"
				);
			}
			const registry: AgentsRegistry = {};
			for (const [name, value] of Object.entries(parsed)) {
				const entry = agentEntrySchema.safeParse(value);
				if (!entry.success) {
					throw new Error(`invalid entry for agent "${name}" in agents.yml`);
				}
				registry[name] = entry.data;
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
	name: string
): Promise<Result<AgentEntry | null, string>> {
	const registry = await readRegistry();
	return registry.map((agents) => agents[name] ?? null);
}

export async function addAgent(
	name: string,
	entry: AgentEntry
): Promise<Result<void, string>> {
	const registry = await readRegistry();
	if (registry.isErr()) return Result.err(registry.error);

	const agents = registry.value;
	if (agents[name]) {
		return Result.err(`agent "${name}" already exists`);
	}
	agents[name] = entry;
	return writeRegistry(agents);
}

export async function updateAgent(
	name: string,
	partial: Partial<AgentEntry>
): Promise<Result<void, string>> {
	const registry = await readRegistry();
	if (registry.isErr()) return Result.err(registry.error);

	const agents = registry.value;
	const existing = agents[name];
	if (!existing) {
		return Result.err(`agent "${name}" not found`);
	}
	agents[name] = {
		command: partial.command ?? existing.command,
		args: partial.args ?? existing.args,
	};
	return writeRegistry(agents);
}

export async function removeAgent(name: string): Promise<Result<void, string>> {
	const registry = await readRegistry();
	if (registry.isErr()) return Result.err(registry.error);

	const agents = registry.value;
	if (!agents[name]) {
		return Result.err(`agent "${name}" not found`);
	}
	delete agents[name];
	return writeRegistry(agents);
}

export type RegisteredAgent = {
	name: string;
	command: string;
	args: string[];
};

/** Registered agents whose command is on PATH (worker capability list). */
export async function listAvailableAgents(): Promise<RegisteredAgent[]> {
	const registry = await readRegistry();
	if (registry.isErr()) return [];

	return Object.entries(registry.value)
		.filter(([, entry]) => isCommandAvailable(entry.command))
		.map(([name, entry]) => ({
			name,
			command: entry.command,
			args: entry.args,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
