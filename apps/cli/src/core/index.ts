import { AgentPool } from "@/core/acp/pool";
import { ThreadCoordinator } from "@/core/threads/coordinator";
import { getAgentEntry } from "./agents/profile";

export function createWorkerRuntime() {
	const agentPool = new AgentPool({ getEntry: getAgentEntry });
	const threadCoordinator = new ThreadCoordinator(agentPool);
	return { agentPool, threadCoordinator };
}

export type WorkerRuntime = ReturnType<typeof createWorkerRuntime>;
