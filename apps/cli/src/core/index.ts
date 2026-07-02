import { AgentPool } from "@/core/acp/pool";
import { ThreadCoordinator } from "@/core/threads/coordinator";
import { getAgent } from "@/store/agents";

export function createWorkerRuntime() {
	const agentPool = new AgentPool({ getEntry: getAgent });
	const threadCoordinator = new ThreadCoordinator(agentPool);
	return { agentPool, threadCoordinator };
}

export type WorkerRuntime = ReturnType<typeof createWorkerRuntime>;
