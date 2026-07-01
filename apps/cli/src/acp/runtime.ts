import { getAgent } from "@/store/agents";
import { AgentProcessManager } from "./process-manager";
import { SessionRouter } from "./session-router";

export function createWorkerRuntime() {
	const processManager = new AgentProcessManager({ getEntry: getAgent });
	const sessionRouter = new SessionRouter(processManager);
	return { processManager, sessionRouter };
}

export type WorkerRuntime = ReturnType<typeof createWorkerRuntime>;
