import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Result } from "better-result";
import { YAML } from "bun";
import { AGENTS_FILE } from "@/constants/file";
import { env } from "@/lib/env";
import type { AgentEntry } from "@/validators/agent";
import { agentEntrySchema } from "@/validators/agent";
import { ensureDir } from "../utils/dir";
import { toMessage } from "../utils/error";

const AGENTS_PATH = join(env.CYRUS_HOME, AGENTS_FILE);

type AgentsRegistry = Record<string, AgentEntry>;

async function readRegistry(): Promise<AgentsRegistry> {
	const file = Bun.file(AGENTS_PATH);
	if (!(await file.exists())) {
		return {};
	}

	const res = await Result.tryPromise(async () => {
		const parsed = YAML.parse(await file.text());
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}
		const registry: AgentsRegistry = {};
		for (const [name, value] of Object.entries(parsed)) {
			const entry = agentEntrySchema.safeParse(value);
			if (entry.success) registry[name] = entry.data;
		}
		return registry;
	});

	return res.match({ ok: (r) => r, err: () => ({}) });
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

export function listAgents(): Promise<AgentsRegistry> {
	return readRegistry();
}

export async function getAgent(name: string): Promise<AgentEntry | null> {
	const registry = await readRegistry();
	return registry[name] ?? null;
}

export async function addAgent(
	name: string,
	entry: AgentEntry
): Promise<Result<void, string>> {
	const registry = await readRegistry();
	if (registry[name]) {
		return Result.err(`agent "${name}" already exists`);
	}
	registry[name] = entry;
	return writeRegistry(registry);
}

export async function updateAgent(
	name: string,
	partial: Partial<AgentEntry>
): Promise<Result<void, string>> {
	const registry = await readRegistry();
	const existing = registry[name];
	if (!existing) {
		return Result.err(`agent "${name}" not found`);
	}
	registry[name] = {
		command: partial.command ?? existing.command,
		args: partial.args ?? existing.args,
	};
	return writeRegistry(registry);
}

export async function removeAgent(name: string): Promise<Result<void, string>> {
	const registry = await readRegistry();
	if (!registry[name]) {
		return Result.err(`agent "${name}" not found`);
	}
	delete registry[name];
	return writeRegistry(registry);
}

export type RegisteredAgent = {
	name: string;
	command: string;
	args: string[];
};

/** Registered agents whose command is on PATH (worker capability list). */
export async function listAvailableAgents(): Promise<RegisteredAgent[]> {
	const registry = await readRegistry();
	return Object.entries(registry)
		.filter(([, entry]) => Bun.which(entry.command) !== null)
		.map(([name, entry]) => ({
			name,
			command: entry.command,
			args: entry.args,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
