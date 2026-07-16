import type { CoordinatorError } from "@cyrus/errors/coordinator";
import type { Result } from "better-result";
import type { AgentRuntime } from "@/core/agents/runtime";

export type BoundThread = {
	threadId: string;
	projectId: string;
	agentName: string;
	sessionId: string;
	cwd: string;
};

export type CoordinatorHost = {
	getAgent(agentName: string): AgentRuntime;
	findLiveBinding(threadId: string): BoundThread | null;
	withRuntime<T>(fn: () => Promise<T>): Promise<Result<T, CoordinatorError>>;
	resolveBoundThread(
		threadId: string,
		projectId?: string
	): Promise<Result<BoundThread, CoordinatorError>>;
	resolveCwd(threadId: string): Promise<Result<string, CoordinatorError>>;
};
