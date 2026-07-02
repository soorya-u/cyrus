import type { AgentProfile } from "@acp-kit/core";
import { getAgent } from "@/store/agents";
import type { AgentEntry } from "@/validators/agent";

export function agentEntryToProfile(
	name: string,
	entry: AgentEntry
): AgentProfile {
	return {
		id: name,
		displayName: name,
		command: entry.command,
		args: entry.args,
	};
}

export async function getAgentEntry(name: string) {
	const result = await getAgent(name);
	if (result.isErr()) throw new Error(result.error);
	return result.value;
}
