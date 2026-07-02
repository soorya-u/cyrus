import type { AgentProfile } from "@acp-kit/core";
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
