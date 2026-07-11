import type { AgentProfile } from "@acp-kit/core";
import { Result } from "better-result";
import { resolveRegistryAgentSpawn } from "@/core/registry/resolve";
import { getAgent } from "@/store/agents";
import type { AgentEntry } from "@/validators/agent";

export async function agentEntryToProfile(
	id: string,
	entry: AgentEntry
): Promise<Result<AgentProfile, string>> {
	const spawn = await resolveRegistryAgentSpawn(entry.registryId);
	if (spawn.isErr()) return Result.err(spawn.error);
	return Result.ok({
		id,
		displayName: entry.name,
		command: spawn.value.command,
		args: spawn.value.args,
	});
}

export async function getAgentEntry(id: string) {
	const result = await getAgent(id);
	if (result.isErr()) throw new Error(result.error);
	if (!result.value) throw new Error(`agent "${id}" is not enabled`);
	return result.value;
}
